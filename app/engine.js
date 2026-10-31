// BatteryTruth engine — runs fully in the browser (and in Node for tests).
// 1) Health check: a faithful port of the project's v1 "voltage-only" ridge model
//    (src/core.py features + results/voltage_only/demo_model.joblib, exported to model.json).
// 2) Charge coach: transparent, rule-based battery-care guidance (general guidance, not a
//    BatteryTruth experimental result). The AI layer (ai.js) only explains/personalises it.

/* ------------------------------------------------------------------ */
/* Health check                                                         */
/* ------------------------------------------------------------------ */

export const POLICY = { maxHalfwidthAh: 0.5 }; // report only when the range is this tight

export class EvidenceError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

function interp(x, xp, fp) {
  // numpy.interp for increasing xp
  if (x <= xp[0]) return fp[0];
  const n = xp.length;
  if (x >= xp[n - 1]) return fp[n - 1];
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (xp[mid] <= x) lo = mid; else hi = mid; }
  const t = (x - xp[lo]) / (xp[hi] - xp[lo]);
  return fp[lo] + t * (fp[hi] - fp[lo]);
}

function slope(x, y) {
  // least-squares slope, same as numpy.polyfit(x, y, 1)[0]
  const n = x.length; let mx = 0, my = 0;
  for (let k = 0; k < n; k++) { mx += x[k]; my += y[k]; }
  mx /= n; my /= n;
  let sxy = 0, sxx = 0;
  for (let k = 0; k < n; k++) { const dx = x[k] - mx; sxy += dx * (y[k] - my); sxx += dx * dx; }
  return sxy / sxx;
}

/** Prefix-only features (src/core.py `features`), restricted to the voltage-only indices. */
export function features(rows, budget) {
  const a = rows.filter(r => r[0] <= budget);
  if (a.length < 10 || !a.every(r => r.every(Number.isFinite)))
    throw new EvidenceError("too_short", "Insufficient or nonfinite observations");
  const t = a.map(r => r[0]), v = a.map(r => r[1]), i = a.map(r => r[2]);
  if (t[0] !== 0) throw new EvidenceError("time_axis", "Expected elapsed seconds starting at zero");
  let maxGap = 0;
  for (let k = 1; k < t.length; k++) {
    const d = t[k] - t[k - 1];
    if (d <= 0) throw new EvidenceError("time_axis", "Expected monotone elapsed seconds");
    if (d > maxGap) maxGap = d;
  }
  if (maxGap > 10) throw new EvidenceError("gap", "Sampling gap exceeds 10 seconds");
  if (v.some(x => x < 2 || x > 3.8) || i.some(x => x < 0 || x > 10))
    throw new EvidenceError("envelope", "Outside supported laboratory signal envelope");
  const tl = t[t.length - 1];
  if (budget - tl > 2) throw new EvidenceError("too_short", "Prefix does not reach requested budget");
  const f = [];
  for (let k = 0; k < 8; k++) f.push(interp(tl * k / 7, t, v));
  f.push(v[v.length - 1] - v[0]);
  const tt = [], vv = [];
  for (let k = 0; k < t.length; k++) if (t[k] >= tl * 0.8) { tt.push(t[k]); vv.push(v[k]); }
  f.push(slope(tt, vv));
  return f; // [v0..v7, voltage_delta, tail_slope_V_per_s]
}

function standardiser(X) {
  const d = X[0].length, n = X.length, mean = new Array(d).fill(0), sd = new Array(d).fill(0);
  for (const r of X) r.forEach((x, j) => (mean[j] += x / n));
  for (const r of X) r.forEach((x, j) => (sd[j] += (x - mean[j]) ** 2 / n));
  for (let j = 0; j < d; j++) sd[j] = Math.sqrt(sd[j]) || 1; // sklearn: zero variance -> scale 1
  return x => x.map((v, j) => (v - mean[j]) / sd[j]);
}
const dist = (a, b) => Math.sqrt(a.reduce((s, x, j) => s + (x - b[j]) ** 2, 0));

/** Assess one observation budget. Mirrors src/demo.py `assess` (diagnostics included). */
export function assessBudget(model, rows, budgetIndex) {
  const B = model.budgets[budgetIndex];
  const x = features(rows, B.budget_s);
  let pred = B.intercept;
  for (let j = 0; j < x.length; j++) pred += B.coef[j] * (x[j] - B.scaler_mean[j]) / B.scaler_scale[j];
  const half = model.halfwidth_Ah[budgetIndex];
  // training-support check and expected error reduction (src/core.py `support_and_gain`)
  const z = standardiser(B.train_X), Z = B.train_X.map(z), zx = z(x);
  let thr = 0;
  Z.forEach((r, a) => { let m = Infinity; Z.forEach((s, b) => { if (a !== b) m = Math.min(m, dist(r, s)); }); thr = Math.max(thr, m); });
  thr *= 1.5;
  const d = Z.map(r => dist(zx, r));
  const supported = Math.min(...d) <= thr;
  const near = d.map((v, k) => [v, k]).sort((p, q) => p[0] - q[0] || p[1] - q[1]).slice(0, 5).map(p => p[1]);
  const nb = Math.min(budgetIndex + 1, 5), E = model.train_errors_Ah;
  const gain = near.reduce((s, k) => s + E[k][budgetIndex] - E[k][nb], 0) / near.length;
  return { budget_s: B.budget_s, point: pred, half, lo: pred - half, hi: pred + half, supported, gain, features: x };
}

/** Walk the session checkpoint by checkpoint: report as soon as the evidence is enough. */
export function runSession(model, rows) {
  const dur = rows.length ? rows[rows.length - 1][0] : 0;
  const checkpoints = [];
  for (let b = 0; b < model.budgets.length; b++) {
    const budget = model.budgets[b].budget_s;
    if (budget - dur > 2) break;
    try {
      const r = assessBudget(model, rows, b);
      r.enough = r.supported && r.half <= POLICY.maxHalfwidthAh;
      checkpoints.push(r);
    } catch (e) {
      if (e instanceof EvidenceError) return { decision: "incompatible", reason: e.code, checkpoints, duration_s: dur };
      throw e;
    }
  }
  if (!checkpoints.length) return { decision: "not_enough_data", reason: "too_short", checkpoints, duration_s: dur };
  const first = checkpoints.find(c => c.enough);
  if (first) return { decision: "report", at: first, checkpoints, duration_s: dur };
  return { decision: "not_assessable", reason: checkpoints.some(c => !c.supported) ? "outside_support" : "too_wide", checkpoints, duration_s: dur };
}

/** CSV/TSV with columns elapsed_s, voltage_V, current_A (header optional). */
export function parseLog(text) {
  const rows = [];
  for (const line of text.split(/\r?\n/)) {
    const cells = line.trim().split(/[,;\t ]+/);
    if (cells.length < 3) continue;
    const r = cells.slice(0, 3).map(Number);
    if (r.every(Number.isFinite)) rows.push(r);
  }
  if (rows.length) { const t0 = rows[0][0]; rows.forEach(r => (r[0] = +(r[0] - t0).toFixed(3))); }
  return rows;
}

/* ------------------------------------------------------------------ */
/* Charge coach (rule-based, general battery-care guidance)             */
/* ------------------------------------------------------------------ */

export const DEFAULT_SCENARIO = {
  chem: "nmc", ambientC: 30, parked: "shade", soc: 35, tripKm: 60, rangeKm: 400, hours: 10,
  packKWh: 60, hasAC: true, acKW: 7, hasDC: true, dcKW: 100, hotDrive: false, precondition: true, storageDays: 0,
};

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

/** Hours of AC charging between two SOC levels (approximate). */
export function acHours(s, from, to) {
  return Math.max(0, (to - from) / 100 * s.packKWh / (s.acKW * 0.9));
}

/** Minutes of DC fast charging between two SOC levels: full power below 50 %, tapering above. */
export function dcMinutes(s, from, to) {
  let min = 0;
  const peak = Math.min(s.dcKW, s.packKWh * 2.5);
  let derate = 1;
  if (s.ambientC < 5 && !s.precondition) derate = 0.5;
  else if (s.ambientC >= 40) derate = 0.8;
  for (let p = Math.floor(from); p < Math.ceil(to); p++) {
    const f = p < 50 ? 1 : p < 80 ? 1 - (p - 50) / 30 * 0.55 : 0.45 - (p - 80) / 20 * 0.25;
    min += (s.packKWh / 100) / (peak * f * derate) * 60;
  }
  return min;
}

/** Relative battery-stress index (0–100) for a charging option. Illustrative, not a measurement. */
export function stress(s, opt) {
  const parts = [];
  const add = (code, v) => { if (v > 0.5) parts.push({ code, v: Math.round(v) }); };
  const heat = Math.max(0, s.ambientC - 25) * 2 + (s.parked === "sun" ? 8 : 0) + (s.hotDrive ? (opt.mode === "dc" ? 12 : 6) : 0);
  add("heat", heat);
  if (opt.mode === "dc") {
    const c = Math.min(s.dcKW, s.packKWh * 2.5) / s.packKWh;
    add("fast_rate", c * 14);
    if (s.ambientC < 5 && !s.precondition) add("cold_fast", (5 - s.ambientC) * 3 + 10);
  } else if (opt.mode === "ac") {
    add("fast_rate", (s.acKW / s.packKWh) * 14);
  }
  const k = s.chem === "lfp" ? 0.35 : 1;
  if (opt.target > 80) add("high_soc", (opt.target - 80) * 0.9 * k);
  if (opt.target >= 90 && opt.dwellH > 1) add("dwell_full", Math.min(opt.dwellH, 24) * 0.8 * k * (s.ambientC > 30 ? 1.6 : 1));
  if (opt.target < 15 || s.soc < 10) add("very_low", 12);
  const total = clamp(parts.reduce((a, p) => a + p.v, 0), 0, 100);
  return { total: Math.round(total), level: total < 25 ? "low" : total < 50 ? "medium" : "high", parts: parts.sort((a, b) => b.v - a.v) };
}

/** Rule-based plan for a scenario. Returns codes + numbers; the UI and the AI turn them into words. */
export function coach(input) {
  const s = { ...DEFAULT_SCENARIO, ...input };
  const tips = [];
  const cold = s.ambientC < 5, hot = s.ambientC >= 32;
  // energy needed for the next trip (+ weather allowance + 10 % reserve)
  const weather = cold ? 1.25 : s.ambientC >= 35 ? 1.08 : 1;
  const needSoc = clamp(Math.ceil(s.tripKm / Math.max(s.rangeKm, 1) * 100 * weather) + 10, 15, 100);
  const dailyCap = s.chem === "lfp" ? 100 : 80;

  if (s.storageDays >= 7) {
    const target = 50;
    const mode = s.soc < 40 ? (s.hasAC ? "ac" : s.hasDC ? "dc" : "none") : s.soc > 65 ? "drive_down" : "none";
    tips.push({ code: "storage_50" }, { code: "storage_cool" }, { code: "check_monthly" });
    if (s.soc > 65) tips.push({ code: "storage_no_full" });
    const opt = { mode: mode === "dc" ? "dc" : "ac", target, dwellH: 0 };
    return { s, kind: "storage", mode, target, needSoc, startInH: 0, durations: { acH: acHours(s, s.soc, target), dcMin: dcMinutes(s, s.soc, target) }, stress: stress(s, opt), compare: null, tips };
  }

  let target = needSoc > dailyCap ? needSoc : (hot && s.chem !== "lfp" ? Math.max(needSoc, 70) : dailyCap);
  target = clamp(Math.round(target / 5) * 5, needSoc, 100);
  const longTrip = needSoc > dailyCap;

  if (s.soc >= Math.max(needSoc, target - 2) || (s.soc >= needSoc && s.hours < 0.75)) {
    tips.push({ code: "no_charge_needed" });
    if (s.soc > 90 && s.chem !== "lfp") tips.push({ code: "dont_hold_full" });
    if (hot) tips.push({ code: "heat_shade" });
    return { s, kind: "trip", mode: "none", target: s.soc, needSoc, startInH: 0, durations: null, stress: stress(s, { mode: "none", target: s.soc, dwellH: 0 }), compare: null, tips };
  }

  const acFull = s.hasAC ? acHours(s, s.soc, target) : Infinity;
  const acNeed = s.hasAC ? acHours(s, s.soc, needSoc) : Infinity;
  let mode, startInH = 0, chosenTarget = target, dwellH = 0;
  if (s.hasAC && acFull <= s.hours - 0.25) {
    mode = "ac"; startInH = Math.max(0, s.hours - acFull - 0.5);
    dwellH = s.hours - startInH - acFull;
    tips.push({ code: "schedule_finish", hours: +startInH.toFixed(1) });
  } else if (s.hasAC && acNeed <= s.hours - 0.25 && !s.hasDC) {
    mode = "ac"; chosenTarget = clamp(Math.floor((s.soc + s.hours * s.acKW * 0.9 / s.packKWh * 100) / 5) * 5, needSoc, target);
    tips.push({ code: "ac_partial" });
  } else if (s.hasAC && acNeed <= s.hours - 0.25 && s.hasDC) {
    mode = "ac"; chosenTarget = clamp(Math.floor((s.soc + (s.hours - 0.25) * s.acKW * 0.9 / s.packKWh * 100) / 5) * 5, needSoc, target);
    tips.push({ code: "ac_partial" });
  } else if (s.hasDC) {
    mode = "dc"; chosenTarget = longTrip ? needSoc : Math.min(target, 80);
    if (chosenTarget < needSoc) chosenTarget = needSoc;
    tips.push({ code: "dc_stop80" });
  } else if (s.hasAC) {
    mode = "ac"; chosenTarget = target; tips.push({ code: "ac_not_enough_time" });
  } else {
    mode = "none"; tips.push({ code: "find_charger" });
  }

  if (mode === "dc" && cold) tips.push({ code: s.precondition ? "cold_precondition" : "cold_no_precondition" });
  if (mode === "dc" && (hot || s.hotDrive)) tips.push({ code: "dc_heat" });
  if (hot || s.parked === "sun") tips.push({ code: "heat_shade" });
  if (cold && mode === "ac") tips.push({ code: "cold_plugged" });
  if (longTrip) tips.push({ code: "long_trip_full" });
  else if (s.chem === "lfp") tips.push({ code: "lfp_full" });
  else tips.push({ code: "nmc_daily80" });
  if (s.soc < 15) tips.push({ code: "low_soc" });
  if (s.chem === "unknown") tips.push({ code: "check_chem" });

  const durations = { acH: s.hasAC ? acHours(s, s.soc, chosenTarget) : null, dcMin: s.hasDC ? dcMinutes(s, s.soc, Math.min(chosenTarget, 100)) : null };
  const chosen = stress(s, { mode, target: chosenTarget, dwellH });
  let compare = null;
  if (s.hasAC && s.hasDC) {
    const acT = s.hasAC ? Math.min(chosenTarget, target) : chosenTarget;
    compare = {
      ac: { stress: stress(s, { mode: "ac", target: acT, dwellH: mode === "ac" ? dwellH : 0 }), hours: acHours(s, s.soc, acT), fits: acHours(s, s.soc, needSoc) <= s.hours - 0.25 },
      dc: { stress: stress(s, { mode: "dc", target: longTrip ? needSoc : Math.min(target, 80), dwellH: 0 }), minutes: dcMinutes(s, s.soc, longTrip ? needSoc : Math.min(target, 80)) },
    };
  }
  return { s, kind: longTrip ? "long_trip" : "trip", mode, target: chosenTarget, needSoc, startInH, durations, stress: chosen, compare, tips };
}

export const SCENARIOS = {
  hot_rush: { chem: "nmc", ambientC: 36, parked: "sun", soc: 25, tripKm: 120, rangeKm: 400, hours: 1, hasAC: true, acKW: 7, hasDC: true, dcKW: 100, hotDrive: true, precondition: true, storageDays: 0 },
  overnight: { chem: "nmc", ambientC: 28, parked: "garage", soc: 35, tripKm: 40, rangeKm: 400, hours: 10, hasAC: true, acKW: 7, hasDC: false, dcKW: 100, hotDrive: false, precondition: true, storageDays: 0 },
  winter: { chem: "nmc", ambientC: -5, parked: "shade", soc: 15, tripKm: 150, rangeKm: 400, hours: 1, hasAC: false, acKW: 7, hasDC: true, dcKW: 150, hotDrive: false, precondition: true, storageDays: 0 },
  weekend: { chem: "nmc", ambientC: 30, parked: "garage", soc: 55, tripKm: 330, rangeKm: 420, hours: 12, hasAC: true, acKW: 7, hasDC: true, dcKW: 150, hotDrive: false, precondition: true, storageDays: 0 },
  storage: { chem: "nmc", ambientC: 33, parked: "garage", soc: 90, tripKm: 0, rangeKm: 400, hours: 24, hasAC: true, acKW: 7, hasDC: false, dcKW: 100, hotDrive: false, precondition: true, storageDays: 21 },
  lfp_daily: { chem: "lfp", ambientC: 31, parked: "shade", soc: 30, tripKm: 50, rangeKm: 350, hours: 9, hasAC: true, acKW: 7, hasDC: true, dcKW: 60, hotDrive: false, precondition: false, storageDays: 0 },
};
