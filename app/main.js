import { coach, SCENARIOS, DEFAULT_SCENARIO, runSession, parseLog } from "./engine.js";
import { Server, AIError } from "./ai.js";

/* ---------------- i18n ---------------- */
const T = {
  vi: {
    tab_log: "Nhật ký sạc", acct_btn: "Tài khoản", ai_off: "AI chưa bật cho bạn", ai_join: "Bắt đầu dùng AI",
    e_noserver: "Chưa kết nối được máy chủ BatteryTruth — AI tạm thời chưa dùng được.", e_join: "Bấm “Bắt đầu” để dùng AI Coach miễn phí.", e_blocked: "Tài khoản đang tạm dừng. Hãy liên hệ hỗ trợ.",
    e_ai_disabled: "AI Coach chưa được bật cho tài khoản của bạn.", e_ai_unavail: "AI Coach tạm thời không khả dụng, thử lại sau.", e_forbidden: "Không thực hiện được: {m}",
    e_consent_chg: "Bật “Lưu dữ liệu sạc & xe” trong Tài khoản để dùng nhật ký sạc.", e_collect_off: "Tính năng lưu nhật ký đang tạm tắt.", e_geo: "Không lấy được vị trí (có thể bạn đã từ chối quyền vị trí).", e_weather: "Không lấy được thời tiết lúc này.",
    loc_btn: "📍 Thời tiết tại chỗ", loc_temp: "Nhiệt độ hiện tại: {c}°C",
    wel_h: "Chào mừng đến BatteryTruth", wel_sub: "Dùng AI Coach miễn phí, không cần email hay mật khẩu. Chọn những gì bạn muốn chia sẻ — có thể đổi ý hoặc xóa dữ liệu bất cứ lúc nào trong Tài khoản.",
    p_name: "Tên gọi (không bắt buộc)", p_vehicle: "Xe của bạn (không bắt buộc)", consent_h: "Bạn cho phép BatteryTruth:",
    c_loc: "Dùng vị trí của tôi", c_loc_d: "Lấy thời tiết tại chỗ và ghi vị trí kèm lần sạc.", c_chg: "Lưu dữ liệu sạc & xe", c_chg_d: "Nhật ký sạc, kết quả kiểm tra pin và dữ liệu từ xe đã kết nối — để gợi ý sát hơn theo thời gian.", c_use: "Lưu cách tôi dùng app & câu hỏi AI", c_use_d: "Giúp cải thiện AI Coach.",
    privacy: "AI Coach chạy trên máy chủ BatteryTruth. Dữ liệu chỉ được lưu theo đúng các lựa chọn trên; thời tiết lấy từ Open-Meteo. Không chọn mục nào bạn vẫn dùng được AI và mọi tính năng.",
    later: "Để sau", start: "Bắt đầu", welcome_ok: "Đã sẵn sàng! AI Coach đã bật.",
    acct_h: "Tài khoản & quyền riêng tư", acct_on: "Mã tài khoản: {id}", acct_none: "Bạn chưa bắt đầu dùng AI Coach.", acct_noserver: "Chưa kết nối máy chủ BatteryTruth.",
    del_data: "Xóa tài khoản & dữ liệu", del_confirm: "Xóa vĩnh viễn tài khoản và toàn bộ dữ liệu của bạn trên máy chủ?", deleted: "Đã xóa dữ liệu của bạn.", close: "Đóng", saved: "Đã lưu", copied: "Đã sao chép",
    log_h: 'Nhật ký <span class="grad">sạc của bạn</span>', log_sub: "Ghi lại các lần sạc — nhập tay hoặc để xe/thiết bị gửi tự động. Càng nhiều dữ liệu, gợi ý càng sát với thói quen của bạn.",
    log_add: "Thêm lần sạc", l_soc_start: "Pin lúc bắt đầu (%)", l_soc_end: "Pin lúc kết thúc (%)", l_kwh: "Điện năng (kWh)", l_dur: "Thời gian (phút)", l_charger: "Loại sạc", l_home: "Tại nhà",
    l_power: "Công suất (kW)", l_temp: "Nhiệt độ ngoài trời (°C)", l_note: "Ghi chú", l_withloc: "Kèm vị trí hiện tại", l_save: "Lưu lần sạc", log_list: "Các lần sạc gần đây", l_when: "Lúc", l_battery: "Pin", l_empty: "Chưa có lần sạc nào.",
    car_h: "Kết nối xe", car_sub: "Thiết bị OBD, app đồng hành hoặc kết nối của hãng xe có thể tự gửi trạng thái pin và sạc vào tài khoản của bạn bằng mã kết nối bên dưới. Hãy giữ bí mật mã này.", car_code: "Mã kết nối của bạn", copy: "Sao chép",
    tab_coach: "Sạc thông minh", tab_health: "Kiểm tra pin", tab_chat: "Hỏi AI", back: "← Giới thiệu", ai_btn: "AI",
    coach_h: 'Hôm nay pin của bạn <span class="grad">cần gì?</span>',
    coach_sub: "Cho biết trời nóng hay lạnh, pin còn bao nhiêu và khi nào bạn đi — BatteryTruth chọn cách sạc vừa đủ cho chuyến đi mà nhẹ nhàng nhất với pin.",
    f_temp: "Nhiệt độ ngoài trời", f_soc: "Pin hiện tại", f_hours: "Bao lâu nữa bạn đi", f_trip: "Chuyến đi tiếp theo", f_range: "Quãng đường khi đầy (km)", f_pack: "Dung lượng pin (kWh)",
    f_chem: "Loại pin", unknown: "Không rõ", f_parked: "Xe đang đỗ ở", p_shade: "Bóng râm", p_sun: "Dưới nắng", p_garage: "Nhà xe",
    f_ac: "Có sạc thường (AC)", f_dc: "Có sạc nhanh (DC)", f_hot: "Vừa chạy đường dài", f_pre: "Xe có làm ấm pin", f_store: "Sắp để xe không dùng",
    stress_lbl: "căng thẳng", factors: "Điều gì đang làm pin căng thẳng", tips: "Làm thế này để pin bền hơn", manual: "Luôn ưu tiên hướng dẫn của hãng xe bạn.",
    ai_title: "AI Coach cá nhân hóa", ai_hint: "Nhờ AI giải thích kế hoạch và điều chỉnh cho đúng tình huống của bạn.", ai_go: "Hỏi AI Coach", ai_need: "Kết nối AI",
    lv_low: "Pin thoải mái", lv_medium: "Pin hơi căng", lv_high: "Pin đang chịu áp lực",
    m_ac: "Sạc thường (AC {kw} kW) đến {t}%", m_dc: "Sạc nhanh (DC) đến {t}%", m_none: "Chưa cần sạc lúc này", m_drive_down: "Đừng sạc — dùng xe giảm về ~50% rồi cất", m_storage_ac: "Sạc nhẹ lên ~50% rồi cất xe", m_find: "Cần tìm bộ sạc",
    s_ac_sched: "Bắt đầu lúc {start} · xong khoảng {end} · đủ cho chuyến {km} km", s_ac_now: "Bắt đầu ngay · mất khoảng {dur} · đủ cho chuyến {km} km", s_dc: "Khoảng {min} phút · đủ cho chuyến {km} km", s_none: "Pin {soc}% đã đủ cho chuyến {km} km (cần khoảng {need}%).", s_store: "Để xe {d} ngày: mức ~50% là nhẹ nhàng nhất cho pin.",
    opt_ac: "Sạc thường", opt_dc: "Sạc nhanh", best: "Khuyên dùng", stress_word: "Căng thẳng", not_fit: "không kịp giờ đi",
    fx_heat: "Nhiệt độ cao", fx_fast_rate: "Tốc độ sạc", fx_cold_fast: "Sạc nhanh khi lạnh", fx_high_soc: "Sạc quá cao", fx_dwell_full: "Nằm lâu ở mức đầy", fx_very_low: "Pin quá thấp", fx_none: "Không có yếu tố đáng lo",
    tip_schedule_finish: "Hẹn giờ sạc để xong ngay trước khi đi (bắt đầu sau khoảng {hours} giờ) — pin ít phải nằm đầy trong lúc nóng.",
    tip_ac_partial: "Không đủ thời gian để sạc đến mức lý tưởng; sạc thường vẫn đủ cho chuyến đi và nhẹ nhàng hơn sạc nhanh.",
    tip_ac_not_enough_time: "Sạc thường không kịp cho chuyến đi; cân nhắc khởi hành muộn hơn hoặc ghé trạm sạc nhanh.",
    tip_dc_stop80: "Dừng sạc nhanh quanh 80%: phần trên 80% chậm hơn nhiều và làm pin nóng thêm.",
    tip_dc_heat: "Trời nóng hoặc pin vừa chạy xa: ưu tiên trạm có mái che, tránh sạc nhanh nhiều lần liên tiếp.",
    tip_heat_shade: "Đỗ xe trong bóng râm hoặc nhà xe — nhiệt độ cao là thứ làm pin già nhanh nhất.",
    tip_cold_precondition: "Bật làm ấm pin khoảng 20–30 phút trước khi tới trạm để sạc nhanh hơn và nhẹ nhàng hơn.",
    tip_cold_no_precondition: "Pin lạnh sạc nhanh sẽ chậm và bị xe giới hạn; nếu được, lái thêm một đoạn cho pin ấm lên.",
    tip_cold_plugged: "Trời lạnh: để xe cắm sạc qua đêm để xe dùng điện lưới giữ ấm pin trước khi đi.",
    tip_long_trip_full: "Chuyến dài: sạc lên {t}% sát giờ đi, đừng để pin đầy rồi đỗ lâu.",
    tip_lfp_full: "Pin LFP thường có thể sạc đầy 100%; nhiều hãng khuyên sạc đầy định kỳ để xe đo pin chính xác.",
    tip_nmc_daily80: "Pin NMC/NCA: hằng ngày giữ quanh 80% là cân bằng giữa quãng đường và tuổi thọ.",
    tip_low_soc: "Tránh để pin nằm lâu dưới 10–15%.",
    tip_check_chem: "Chưa rõ loại pin? Xem sách hướng dẫn — LFP và NMC có ngưỡng sạc khuyên dùng khác nhau.",
    tip_no_charge_needed: "Pin hiện tại đã đủ cho chuyến đi — chưa cần sạc ngay.",
    tip_dont_hold_full: "Pin đang rất đầy; nếu chưa đi ngay thì đừng sạc thêm.",
    tip_find_charger: "Chưa có bộ sạc phù hợp — hãy tìm trạm gần nhất trên tuyến đường.",
    tip_storage_50: "Để xe lâu: giữ pin quanh 50% là nhẹ nhàng nhất.",
    tip_storage_cool: "Cất xe nơi mát, tránh nắng trực tiếp.",
    tip_check_monthly: "Kiểm tra mức pin mỗi 2–4 tuần, sạc bù nếu xuống dưới 30%.",
    tip_storage_no_full: "Đừng cất xe khi pin gần đầy — dùng xe để giảm về khoảng 50% trước.",
    sc_hot_rush: "☀️ 36°C, phải đi sau 1 giờ", sc_overnight: "🌙 Sạc qua đêm, mai đi làm", sc_winter: "❄️ Sáng −5°C, trạm sạc nhanh", sc_weekend: "🛣️ Đi xa cuối tuần", sc_storage: "🧳 Để xe 3 tuần", sc_lfp_daily: "🔋 Pin LFP, dùng hằng ngày",
    health_h: 'Pin của bạn <span class="grad">còn khỏe không?</span>',
    health_sub: "Chọn một phiên sạc hoặc tải nhật ký sạc lên. BatteryTruth đọc điện áp theo thời gian, ước lượng dung lượng kèm khoảng tin cậy, và chỉ báo cáo khi bằng chứng đủ mạnh.",
    pick: "Chọn phiên sạc", upload: "⬆︎ Tải nhật ký sạc của bạn (CSV)", csv_fmt: "Cột: thời gian (s), điện áp (V), dòng điện (A).", csv_tmpl: "Tải file mẫu",
    run: "▶ Kiểm tra pin", running: "Đang phân tích…", evidence: "Bằng chứng từ lần sạc", verdict: "Kết luận", v_idle: "Chọn một phiên sạc rồi bấm Kiểm tra pin.", checkpoints: "Các mốc kiểm tra", details: "Xem ước lượng ở mọi mốc",
    eng_browser: "Chạy ngay trên thiết bị của bạn", eng_server: "BatteryTruth API",
    s_A: "Pin A · phiên sạc 40 phút", s_B: "Pin B · phiên sạc 40 phút", s_C: "Pin C · phiên sạc 40 phút", s_D: "Pin D · phiên sạc 40 phút", s_E: "Pin A · phiên sạc ngắn 4 phút", s_U: "Nhật ký của bạn",
    sd_A: "Dữ liệu điện áp & dòng mỗi giây", sd_E: "Thử khi bằng chứng chưa đủ", sd_U: "{n} dòng dữ liệu",
    cp_enough: "Đủ bằng chứng", cp_wide: "Chưa đủ chắc", cp_out: "Khác dữ liệu đã học", min: "phút",
    v_report: "Dung lượng {lo} – {hi} Ah", v_report_t: "Đủ bằng chứng sau {m} phút sạc — dừng sớm, không cần chờ sạc đầy.",
    v_short: "Chưa đủ dữ liệu", v_short_t: "Cần ít nhất 5 phút sạc liên tục để đánh giá. Hãy sạc lâu hơn một chút rồi thử lại.",
    v_incompat: "Chưa đọc được dữ liệu này", v_incompat_t: "Nhật ký phải có thời gian tăng dần từ 0 (mỗi bước ≤ 10 giây), điện áp 2–3,8 V và dòng 0–10 A — dạng sạc của cell LFP mà BatteryTruth hỗ trợ.",
    v_na: "Chưa đủ bằng chứng", v_na_t: "Khoảng ước lượng còn quá rộng hoặc dữ liệu khác với những gì mô hình đã học. BatteryTruth không đoán — hãy sạc thêm hoặc kiểm tra chuyên sâu.",
    truth: "Dung lượng đo đối chứng: {v} Ah — {ok}", inside: "nằm trong khoảng ✓", outside: "lệch khỏi khoảng {d} Ah",
    th_t: "Mốc", th_p: "Ước lượng (Ah)", th_r: "Khoảng (Ah)", th_s: "Khớp dữ liệu đã học",
    chat_h: 'Hỏi <span class="grad">AI Coach</span> về pin',
    chat_sub: "AI biết tình huống bạn vừa nhập ở tab Sạc thông minh và kết quả kiểm tra pin gần nhất.",
    ask_ph: "Ví dụ: Sạc nhanh mỗi ngày có hại pin không?", send: "Gửi",
    q1: "Sạc nhanh mỗi ngày có hại pin không?", q2: "Trời 38°C có nên sạc đầy 100%?", q3: "Pin còn bao nhiêu % thì nên sạc?", q4: "Để xe ngoài nắng cả ngày có sao không?",
    hello: "Xin chào! Tôi là BatteryTruth Coach. Hỏi tôi bất cứ điều gì về sạc và giữ pin bền lâu.",
    set_h: "Kết nối AI Coach", set_sub: "Chọn cách AI hoạt động. Không có AI, app vẫn đưa khuyến nghị bằng bộ quy tắc chăm sóc pin.",
    m_server: "Máy chủ BatteryTruth", m_byok: "API key của tôi (Claude, OpenAI, Gemini…)", byok_note: "Key chỉ lưu trên thiết bị này và chỉ gửi tới nhà cung cấp bạn chọn.",
    prov: "Nhà cung cấp AI", key: "API key", get_key: "Lấy key ↗", load_models: "Tải danh sách model", base_url: "Địa chỉ API (tương thích OpenAI)", key_optional: "Không bắt buộc", models_found: "Tìm thấy {n} model",
    note_compat: "Dùng chuẩn OpenAI Chat Completions.", note_ollama: "Chạy Ollama trên máy và cho phép trình duyệt gọi: đặt OLLAMA_ORIGINS=* rồi khởi động lại Ollama.", note_custom: "Nhập địa chỉ kết thúc bằng /v1 của bất kỳ dịch vụ tương thích OpenAI nào (LM Studio, vLLM, Together, Fireworks, Azure…).",
    e_model: "Không tìm thấy model — bấm “Tải danh sách model” để chọn đúng tên.", e_config: "Thiếu cấu hình AI: {m}", remember: "Ghi nhớ trên thiết bị này",
    m_off: "Tắt AI", off_note: "Chỉ dùng bộ quy tắc chăm sóc pin (không gửi dữ liệu đi đâu).", cancel: "Hủy", save: "Lưu",
    srv_ok: "Đã kết nối · AI {ai}", srv_ai_on: "sẵn sàng", srv_ai_off: "chưa cấu hình key", srv_none: "Không tìm thấy máy chủ — nhập địa chỉ API nếu có.",
    e_auth: "API key không hợp lệ.", e_rate: "AI đang bận hoặc bạn đã dùng hết lượt hôm nay — thử lại sau.", e_network: "Không kết nối được máy chủ BatteryTruth.", e_refusal: "AI không trả lời yêu cầu này.", e_other: "AI gặp lỗi: {m}", e_nokey: "Hãy kết nối AI trước (nút AI ở góc trên).",
    a_steps: "Các bước", a_why: "Vì sao",
    h: "giờ", hm: "{h} giờ {m} phút", mins: "{m} phút",
  },
  en: {
    tab_log: "Charging log", acct_btn: "Account", ai_off: "AI not enabled for you", ai_join: "Start using AI",
    e_noserver: "Can't reach the BatteryTruth server — AI is unavailable for now.", e_join: "Press “Start” to use the AI Coach for free.", e_blocked: "Your account is paused. Please contact support.",
    e_ai_disabled: "The AI Coach isn't enabled for your account.", e_ai_unavail: "The AI Coach is temporarily unavailable, try again later.", e_forbidden: "Not allowed: {m}",
    e_consent_chg: "Turn on “Save charging & vehicle data” in Account to use the charging log.", e_collect_off: "The charging log is turned off for now.", e_geo: "Couldn't get your location (permission may be blocked).", e_weather: "Couldn't get the weather right now.",
    loc_btn: "📍 Local weather", loc_temp: "Current temperature: {c}°C",
    wel_h: "Welcome to BatteryTruth", wel_sub: "Use the AI Coach for free — no email or password. Choose what you'd like to share; you can change your mind or delete your data any time under Account.",
    p_name: "Name (optional)", p_vehicle: "Your car (optional)", consent_h: "You allow BatteryTruth to:",
    c_loc: "Use my location", c_loc_d: "Get local weather and attach a location to charging sessions.", c_chg: "Save charging & vehicle data", c_chg_d: "Charging log, battery checks and data from a connected car — for advice that gets better over time.", c_use: "Save how I use the app & my AI questions", c_use_d: "Helps improve the AI Coach.",
    privacy: "The AI Coach runs on the BatteryTruth server. Data is stored only as chosen above; weather comes from Open-Meteo. With nothing selected you can still use the AI and every feature.",
    later: "Later", start: "Start", welcome_ok: "All set! The AI Coach is on.",
    acct_h: "Account & privacy", acct_on: "Account ID: {id}", acct_none: "You haven't started using the AI Coach yet.", acct_noserver: "Not connected to the BatteryTruth server.",
    del_data: "Delete account & data", del_confirm: "Permanently delete your account and all your data on the server?", deleted: "Your data was deleted.", close: "Close", saved: "Saved", copied: "Copied",
    log_h: 'Your <span class="grad">charging log</span>', log_sub: "Record your charges — by hand, or let your car or device send them automatically. The more data, the closer the advice fits your habits.",
    log_add: "Add a charge", l_soc_start: "Battery at start (%)", l_soc_end: "Battery at end (%)", l_kwh: "Energy (kWh)", l_dur: "Duration (min)", l_charger: "Charger", l_home: "Home",
    l_power: "Power (kW)", l_temp: "Outside temperature (°C)", l_note: "Note", l_withloc: "Attach my current location", l_save: "Save charge", log_list: "Recent charges", l_when: "When", l_battery: "Battery", l_empty: "No charges yet.",
    car_h: "Connect your car", car_sub: "An OBD adapter, companion app or carmaker connection can send battery and charging status to your account automatically using the connection code below. Keep this code private.", car_code: "Your connection code", copy: "Copy",
    tab_coach: "Smart charging", tab_health: "Battery check", tab_chat: "Ask AI", back: "← Overview", ai_btn: "AI",
    coach_h: 'What does your battery <span class="grad">need today?</span>',
    coach_sub: "Tell us how hot or cold it is, how much charge you have and when you leave — BatteryTruth picks the charge that covers your trip and is gentlest on the battery.",
    f_temp: "Outside temperature", f_soc: "Battery now", f_hours: "Leaving in", f_trip: "Next trip", f_range: "Full-charge range (km)", f_pack: "Battery size (kWh)",
    f_chem: "Battery type", unknown: "Not sure", f_parked: "Car is parked in", p_shade: "Shade", p_sun: "Sun", p_garage: "Garage",
    f_ac: "AC charger available", f_dc: "DC fast charger", f_hot: "Just drove a long way", f_pre: "Car can warm the battery", f_store: "Car will sit unused",
    stress_lbl: "stress", factors: "What is stressing the battery", tips: "Do this to make it last", manual: "Your car maker's instructions always come first.",
    ai_title: "Personal AI Coach", ai_hint: "Let the AI explain the plan and tailor it to your situation.", ai_go: "Ask AI Coach", ai_need: "Connect AI",
    lv_low: "Battery is relaxed", lv_medium: "Battery is a bit stressed", lv_high: "Battery is under pressure",
    m_ac: "AC charge ({kw} kW) to {t}%", m_dc: "DC fast charge to {t}%", m_none: "No need to charge now", m_drive_down: "Don't charge — drive down to ~50%, then store", m_storage_ac: "Top up to ~50%, then store", m_find: "Find a charger",
    s_ac_sched: "Start at {start} · done around {end} · covers your {km} km trip", s_ac_now: "Start now · about {dur} · covers your {km} km trip", s_dc: "About {min} min · covers your {km} km trip", s_none: "{soc}% already covers your {km} km trip (needs about {need}%).", s_store: "Parked for {d} days: about 50% is gentlest on the battery.",
    opt_ac: "AC charge", opt_dc: "Fast charge", best: "Recommended", stress_word: "Stress", not_fit: "won't be ready in time",
    fx_heat: "Heat", fx_fast_rate: "Charging speed", fx_cold_fast: "Fast charging when cold", fx_high_soc: "Charging very high", fx_dwell_full: "Sitting full for long", fx_very_low: "Very low charge", fx_none: "Nothing to worry about",
    tip_schedule_finish: "Schedule charging to finish just before you leave (start in about {hours} h) — less time sitting full and warm.",
    tip_ac_partial: "Not enough time for the ideal level; AC still covers your trip and is gentler than fast charging.",
    tip_ac_not_enough_time: "AC won't be ready for your trip; consider leaving later or stopping at a fast charger.",
    tip_dc_stop80: "Stop fast charging around 80%: above that it is much slower and adds heat.",
    tip_dc_heat: "Hot day or a warm pack: prefer a covered station and avoid back-to-back fast charges.",
    tip_heat_shade: "Park in the shade or a garage — heat ages a battery faster than anything else.",
    tip_cold_precondition: "Turn on battery preconditioning 20–30 minutes before the station for a faster, gentler charge.",
    tip_cold_no_precondition: "A cold battery fast-charges slowly and the car limits it; if you can, drive a bit first to warm it.",
    tip_cold_plugged: "Cold weather: leave the car plugged in overnight so it can warm the battery from the grid.",
    tip_long_trip_full: "Long trip: charge to {t}% close to departure; don't leave it full and parked.",
    tip_lfp_full: "LFP batteries can usually be charged to 100%; many makers recommend a full charge regularly so the car reads the battery accurately.",
    tip_nmc_daily80: "NMC/NCA batteries: around 80% for daily use balances range and lifespan.",
    tip_low_soc: "Avoid leaving the battery below 10–15% for long.",
    tip_check_chem: "Not sure of your battery type? Check the manual — LFP and NMC have different recommended limits.",
    tip_no_charge_needed: "You already have enough for this trip — no need to charge now.",
    tip_dont_hold_full: "The battery is very full; if you're not leaving soon, don't add more.",
    tip_find_charger: "No suitable charger yet — find the nearest station on your route.",
    tip_storage_50: "Long parking: keeping the battery around 50% is gentlest.",
    tip_storage_cool: "Store the car somewhere cool, out of direct sun.",
    tip_check_monthly: "Check the charge every 2–4 weeks and top up if it drops below 30%.",
    tip_storage_no_full: "Don't store it nearly full — drive it down to about 50% first.",
    sc_hot_rush: "☀️ 36°C, leaving in 1 hour", sc_overnight: "🌙 Overnight, commute tomorrow", sc_winter: "❄️ −5°C morning, fast charger", sc_weekend: "🛣️ Weekend road trip", sc_storage: "🧳 Parking for 3 weeks", sc_lfp_daily: "🔋 LFP battery, daily use",
    health_h: 'Is your battery <span class="grad">still healthy?</span>',
    health_sub: "Pick a charging session or upload a charging log. BatteryTruth reads voltage over time, estimates capacity with a confidence range, and reports only when the evidence is strong enough.",
    pick: "Choose a charging session", upload: "⬆︎ Upload your charging log (CSV)", csv_fmt: "Columns: time (s), voltage (V), current (A).", csv_tmpl: "Download a template",
    run: "▶ Check battery", running: "Analysing…", evidence: "Evidence from this charge", verdict: "Verdict", v_idle: "Choose a session, then press Check battery.", checkpoints: "Checkpoints", details: "See the estimate at every checkpoint",
    eng_browser: "Runs on your device", eng_server: "BatteryTruth API",
    s_A: "Battery A · 40-min session", s_B: "Battery B · 40-min session", s_C: "Battery C · 40-min session", s_D: "Battery D · 40-min session", s_E: "Battery A · short 4-min session", s_U: "Your log",
    sd_A: "Voltage & current every second", sd_E: "See what happens without enough evidence", sd_U: "{n} rows",
    cp_enough: "Enough evidence", cp_wide: "Not sure yet", cp_out: "Unlike learned data", min: "min",
    v_report: "Capacity {lo} – {hi} Ah", v_report_t: "Enough evidence after {m} minutes of charging — stopped early, no need to wait for a full charge.",
    v_short: "Not enough data yet", v_short_t: "At least 5 minutes of continuous charging are needed. Charge a little longer and try again.",
    v_incompat: "Can't read this log yet", v_incompat_t: "The log needs time rising from 0 (steps ≤ 10 s), voltage 2–3.8 V and current 0–10 A — the LFP-cell charging profile BatteryTruth supports.",
    v_na: "Not enough evidence", v_na_t: "The range is still too wide or the data differ from what the model has learned. BatteryTruth won't guess — charge longer or get an in-depth check.",
    truth: "Reference capacity: {v} Ah — {ok}", inside: "inside the range ✓", outside: "outside the range by {d} Ah",
    th_t: "Checkpoint", th_p: "Estimate (Ah)", th_r: "Range (Ah)", th_s: "Matches learned data",
    chat_h: 'Ask the <span class="grad">AI Coach</span>',
    chat_sub: "The AI knows the situation you entered under Smart charging and your latest battery check.",
    ask_ph: "e.g. Is fast charging every day bad for the battery?", send: "Send",
    q1: "Is fast charging every day bad for the battery?", q2: "It's 38°C — should I charge to 100%?", q3: "At what % should I charge?", q4: "Is parking in the sun all day a problem?",
    hello: "Hi! I'm the BatteryTruth Coach. Ask me anything about charging and keeping your battery healthy.",
    set_h: "Connect the AI Coach", set_sub: "Choose how the AI runs. Without AI, the app still recommends using its battery-care rules.",
    m_server: "BatteryTruth server", m_byok: "My own API key (Claude, OpenAI, Gemini…)", byok_note: "The key stays on this device and is sent only to the provider you choose.",
    prov: "AI provider", key: "API key", get_key: "Get a key ↗", load_models: "Load model list", base_url: "API address (OpenAI-compatible)", key_optional: "Optional", models_found: "{n} models found",
    note_compat: "Uses the OpenAI Chat Completions standard.", note_ollama: "Run Ollama locally and allow browser access: set OLLAMA_ORIGINS=* and restart Ollama.", note_custom: "Enter the /v1 address of any OpenAI-compatible service (LM Studio, vLLM, Together, Fireworks, Azure…).",
    e_model: "Model not found — use “Load model list” to pick the exact name.", e_config: "AI settings incomplete: {m}", remember: "Remember on this device",
    m_off: "AI off", off_note: "Battery-care rules only (nothing is sent anywhere).", cancel: "Cancel", save: "Save",
    srv_ok: "Connected · AI {ai}", srv_ai_on: "ready", srv_ai_off: "no key configured", srv_none: "No server found — enter an API address if you have one.",
    e_auth: "Invalid API key.", e_rate: "The AI is busy or you've used today's questions — try again later.", e_network: "Can't reach the BatteryTruth server.", e_refusal: "The AI declined this request.", e_other: "AI error: {m}", e_nokey: "Connect the AI first (AI button, top right).",
    a_steps: "Steps", a_why: "Why",
    h: "h", hm: "{h} h {m} min", mins: "{m} min",
  },
};
const q = Object.fromEntries(new URLSearchParams(location.search));
const pref = (k, d) => { try { return localStorage.getItem("bt_" + k) || d; } catch { return d; } };
const savePref = (k, v) => { try { localStorage.setItem("bt_" + k, v); } catch {} };
let LANG = q.lang || pref("lang", "vi");
let THEME = q.theme || pref("theme", "dark");
const t = (k, p = {}) => (T[LANG][k] ?? T.en[k] ?? k).replace(/\{(\w+)\}/g, (_, n) => p[n] ?? "");
const $ = s => document.querySelector(s);
const fmt = (x, d = 2) => LANG === "vi" ? x.toFixed(d).replace(".", ",") : x.toFixed(d);
const dur = h => { const m = Math.round(h * 60); return m < 60 ? t("mins", { m }) : m % 60 ? t("hm", { h: Math.floor(m / 60), m: m % 60 }) : `${m / 60} ${t("h")}`; };
const clockAt = h => { const d = new Date(Date.now() + h * 3600e3); return d.toLocaleTimeString(LANG === "vi" ? "vi-VN" : "en-GB", { hour: "2-digit", minute: "2-digit" }); };
const toast = msg => { const el = $("#toast"); el.textContent = msg; el.style.display = "block"; clearTimeout(toast.h); toast.h = setTimeout(() => (el.style.display = "none"), 3500); };

function applyLang() {
  document.documentElement.lang = LANG;
  document.querySelectorAll("[data-i]").forEach(el => (el.innerHTML = t(el.dataset.i)));
  $("#langBtn").innerHTML = LANG === "vi" ? "EN · <b>VI</b>" : "<b>EN</b> · VI";
  $("#askIn").placeholder = t("ask_ph"); $("#askBtn").textContent = t("send");
  renderScenarioChips(); renderCoach(); renderSamples(); renderHealth(); renderSugg(); renderChat(); renderAiState(); if (typeof renderLog === "function") renderLog();
}
function applyTheme() { document.documentElement.dataset.theme = THEME; $("#themeBtn").textContent = THEME === "light" ? "☀" : "☾"; }
$("#langBtn").onclick = () => { LANG = LANG === "vi" ? "en" : "vi"; savePref("lang", LANG); applyLang(); };
$("#themeBtn").onclick = () => { THEME = THEME === "light" ? "dark" : "light"; savePref("theme", THEME); applyTheme(); };

/* ---------------- tabs ---------------- */
function show(v) {
  document.querySelectorAll("#tabs button").forEach(b => b.classList.toggle("on", b.dataset.v === v));
  document.querySelectorAll(".view").forEach(s => s.classList.toggle("on", s.id === "v-" + v));
  history.replaceState(null, "", "#" + v);
}
document.querySelectorAll("#tabs button").forEach(b => (b.onclick = () => show(b.dataset.v)));

/* ---------------- account & server ---------------- */
const API_BASE = (q.api || window.BT_CONFIG?.apiBase || "").replace(/\/+$/, "");
const ACC = { server: null, token: "", profile: null };
try { ACC.token = localStorage.getItem("bt_user_token") || ""; } catch {}
let SRV = new Server(API_BASE, ACC.token);
function setToken(tok) {
  ACC.token = tok; SRV = new Server(API_BASE, tok);
  try { tok ? localStorage.setItem("bt_user_token", tok) : localStorage.removeItem("bt_user_token"); } catch {}
}
async function initAccount() {
  if (!API_BASE && location.hostname.endsWith("github.io")) ACC.server = null; // no server configured for this static copy
  else {
    try { ACC.server = await SRV.status(); if (!String(ACC.server?.service || "").startsWith("batterytruth")) ACC.server = null; } catch { ACC.server = null; }
    if (ACC.server && ACC.token) { try { ACC.profile = await SRV.me(); } catch (e) { if (e.code === "auth") setToken(""); } }
  }
  renderAiState(); renderHealth(); renderLog();
  if (ACC.server && !ACC.profile && !pref("welcome_skipped", "")) openWelcome();
}
function aiReady() { return !!(ACC.server?.ai_available && ACC.profile && ACC.profile.status === "active" && ACC.profile.ai_enabled); }
function aiBlockedMsg() {
  if (!ACC.server) return t("e_noserver");
  if (!ACC.profile) return t("e_join");
  if (ACC.profile.status !== "active") return t("e_blocked");
  if (!ACC.profile.ai_enabled) return t("e_ai_disabled");
  return t("e_ai_unavail");
}
function renderAiState() {
  $("#aiDot").classList.toggle("on", !!ACC.profile);
  $("#adviseBtn").textContent = aiReady() ? "✦ " + t("ai_go") : ACC.profile ? t("ai_off") : t("ai_join");
}
function explainAI() { if (ACC.server && !ACC.profile) return openWelcome(); toast(aiBlockedMsg()); }
function openWelcome() { ["w_loc", "w_chg", "w_use"].forEach(id => ($("#" + id).checked = false)); $("#welcome").classList.add("on"); }
$("#w_skip").onclick = () => { savePref("welcome_skipped", "1"); $("#welcome").classList.remove("on"); };
$("#w_go").onclick = async () => {
  try {
    const r = await SRV.register({ name: $("#w_name").value.trim(), vehicle: $("#w_vehicle").value.trim(), chem: S.chem, consents: { location: $("#w_loc").checked, charging: $("#w_chg").checked, usage: $("#w_use").checked } });
    setToken(r.token); ACC.profile = await SRV.me();
    $("#welcome").classList.remove("on"); toast(t("welcome_ok")); renderAiState(); renderLog();
  } catch (e) { toast(aiErr(e)); }
};
function openSettings() {
  const has = !!ACC.profile;
  $("#acctBody").style.display = has ? "" : "none"; $("#acctNone").style.display = has ? "none" : "";
  $("#acctState").textContent = !ACC.server ? t("acct_noserver") : has ? t("acct_on", { id: ACC.profile.id }) : t("acct_none");
  if (has) {
    const p = ACC.profile; $("#a_name").value = p.name || ""; $("#a_vehicle").value = p.vehicle || "";
    $("#a_loc").checked = !!p.consent_location; $("#a_chg").checked = !!p.consent_charging; $("#a_use").checked = !!p.consent_usage;
  }
  $("#a_join").style.display = ACC.server ? "" : "none";
  $("#modal").classList.add("on");
}
$("#aiBtn").onclick = openSettings;
$("#setCancel").onclick = () => $("#modal").classList.remove("on");
$("#setCancel2").onclick = () => $("#modal").classList.remove("on");
$("#a_join").onclick = () => { $("#modal").classList.remove("on"); openWelcome(); };
$("#setSave").onclick = async () => {
  try {
    ACC.profile = await SRV.updateMe({ name: $("#a_name").value.trim(), vehicle: $("#a_vehicle").value.trim(), consents: { location: $("#a_loc").checked, charging: $("#a_chg").checked, usage: $("#a_use").checked } });
    $("#modal").classList.remove("on"); toast(t("saved")); renderAiState(); renderLog();
  } catch (e) { toast(aiErr(e)); }
};
$("#a_delete").onclick = async () => {
  if (!confirm(t("del_confirm"))) return;
  try { await SRV.deleteMe(); } catch {}
  setToken(""); ACC.profile = null; $("#modal").classList.remove("on"); toast(t("deleted")); renderAiState(); renderLog();
};
function aiErr(e) {
  if (e instanceof AIError) {
    const m = { network: "e_network", rate: "e_rate", refusal: "e_refusal", unavailable: "e_ai_unavail", forbidden: "e_forbidden" }[e.code];
    return m ? t(m, { m: e.message }) : t("e_other", { m: e.message });
  }
  return t("e_other", { m: e.message || String(e) });
}

/* ---------------- location + local weather ---------------- */
let LAST_LOC = null;
const getPos = () => new Promise((ok, no) => navigator.geolocation ? navigator.geolocation.getCurrentPosition(p => ok(p.coords), no, { timeout: 10000, maximumAge: 300000 }) : no());
$("#locBtn").onclick = async e => {
  e.preventDefault();
  let c; try { c = await getPos(); } catch { return toast(t("e_geo")); }
  LAST_LOC = { lat: +c.latitude.toFixed(5), lon: +c.longitude.toFixed(5) };
  let temp = null;
  try { const w = await (await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${c.latitude.toFixed(3)}&longitude=${c.longitude.toFixed(3)}&current=temperature_2m`)).json(); temp = w?.current?.temperature_2m; } catch {}
  if (Number.isFinite(temp)) { S.ambientC = Math.max(-15, Math.min(45, Math.round(temp))); activeScenario = ""; update(); toast(t("loc_temp", { c: Math.round(temp) })); }
  else toast(t("e_weather"));
  if (ACC.profile?.consent_location && ACC.server?.collect?.location)
    SRV.location({ ...LAST_LOC, accuracy_m: c.accuracy, ambient_c: Number.isFinite(temp) ? temp : null }).catch(() => {});
};

/* ---------------- charging log ---------------- */
let LOG_CHARGER = "AC";
document.querySelectorAll("#l_charger button").forEach(b => (b.onclick = () => { LOG_CHARGER = b.dataset.v; document.querySelectorAll("#l_charger button").forEach(x => x.classList.toggle("on", x === b)); }));
async function renderLog() {
  $("#l_save").textContent = t("l_save");
  const gate = !ACC.server ? t("e_noserver") : !ACC.profile ? t("e_join") : !ACC.profile.consent_charging ? t("e_consent_chg") : !ACC.server.collect?.charging ? t("e_collect_off") : "";
  $("#logGate").textContent = gate; $("#l_save").disabled = !!gate;
  $("#devToken").value = ACC.token || ""; $("#telUrl").textContent = (API_BASE || location.origin) + "/api/v1/telemetry";
  let rows = [];
  if (!gate) { try { rows = await SRV.sessions(); } catch {} }
  const esc = x => String(x ?? "").replace(/[&<>]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[ch]));
  $("#logTbl").innerHTML = rows.length
    ? `<tr><th>${t("l_when")}</th><th>${t("l_battery")}</th><th>kWh</th><th>${t("l_charger")}</th><th>°C</th><th></th></tr>` + rows.map(r => `<tr><td>${new Date(r.ts * 1000).toLocaleString(LANG === "vi" ? "vi-VN" : "en-GB", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td><td>${r.soc_start ?? "?"}% → ${r.soc_end ?? "?"}%</td><td>${r.kwh ?? "—"}</td><td>${esc(r.charger)} ${r.power_kw ? r.power_kw + " kW" : ""}</td><td>${r.ambient_c ?? "—"}</td><td><a href="#" data-del="${r.id}">✕</a></td></tr>`).join("")
    : `<tr><td class="small">${t("l_empty")}</td></tr>`;
  document.querySelectorAll("#logTbl a[data-del]").forEach(a => (a.onclick = async ev => { ev.preventDefault(); await SRV.deleteSession(a.dataset.del).catch(() => {}); renderLog(); }));
}
$("#l_save").onclick = async () => {
  const num = id => { const v = $("#" + id).value.trim(); return v === "" ? null : +v; };
  const body = { source: "manual", soc_start: num("l_soc_start"), soc_end: num("l_soc_end"), kwh: num("l_kwh"), duration_min: num("l_dur"), power_kw: num("l_power"), ambient_c: num("l_temp"), charger: LOG_CHARGER, note: $("#l_note").value.trim() };
  if ($("#l_withloc").checked) {
    if (!LAST_LOC) { try { const c = await getPos(); LAST_LOC = { lat: +c.latitude.toFixed(5), lon: +c.longitude.toFixed(5) }; } catch { toast(t("e_geo")); } }
    if (LAST_LOC) Object.assign(body, LAST_LOC);
  }
  try {
    await SRV.addSession(body); toast(t("saved"));
    ["l_soc_start", "l_soc_end", "l_kwh", "l_dur", "l_power", "l_temp", "l_note"].forEach(id => ($("#" + id).value = ""));
    renderLog();
  } catch (e) { toast(aiErr(e)); }
};
$("#copyToken").onclick = async () => {
  if (!ACC.token) return toast(t("e_join"));
  try { await navigator.clipboard.writeText(ACC.token); toast(t("copied")); } catch { $("#devToken").type = "text"; $("#devToken").select(); }
};

/* ---------------- coach ---------------- */
let S = { ...DEFAULT_SCENARIO }, activeScenario = "", lastPlan = null, lastHealth = null;
const SLIDERS = { ambientC: v => `${v}°C`, soc: v => `${v}%`, hours: v => dur(+v), tripKm: v => `${v} km`, storageDays: v => (+v ? `${v} ${LANG === "vi" ? "ngày" : "days"}` : "—") };
function syncForm() {
  for (const k of Object.keys(SLIDERS)) { $("#" + k).value = S[k]; $("#o_" + k).textContent = SLIDERS[k](S[k]); }
  $("#rangeKm").value = S.rangeKm; $("#packKWh").value = S.packKWh; $("#acKW").value = String(S.acKW); $("#dcKW").value = String(S.dcKW);
  for (const k of ["hasAC", "hasDC", "hotDrive", "precondition"]) $("#" + k).checked = !!S[k];
  for (const k of ["chem", "parked"]) document.querySelectorAll(`#${k} button`).forEach(b => b.classList.toggle("on", b.dataset.v === S[k]));
}
function bindForm() {
  for (const k of Object.keys(SLIDERS)) $("#" + k).oninput = e => { S[k] = +e.target.value; activeScenario = ""; update(); };
  for (const k of ["rangeKm", "packKWh"]) $("#" + k).onchange = e => { S[k] = Math.max(1, +e.target.value || DEFAULT_SCENARIO[k]); activeScenario = ""; update(); };
  for (const k of ["acKW", "dcKW"]) $("#" + k).onchange = e => { S[k] = +e.target.value; activeScenario = ""; update(); };
  for (const k of ["hasAC", "hasDC", "hotDrive", "precondition"]) $("#" + k).onchange = e => { S[k] = e.target.checked; activeScenario = ""; update(); };
  for (const k of ["chem", "parked"]) document.querySelectorAll(`#${k} button`).forEach(b => (b.onclick = () => { S[k] = b.dataset.v; activeScenario = ""; update(); }));
}
function renderScenarioChips() {
  $("#scen").innerHTML = Object.keys(SCENARIOS).map(k => `<button class="chip${k === activeScenario ? " on" : ""}" data-k="${k}">${t("sc_" + k)}</button>`).join("");
  document.querySelectorAll("#scen .chip").forEach(c => (c.onclick = () => { activeScenario = c.dataset.k; S = { ...DEFAULT_SCENARIO, ...SCENARIOS[c.dataset.k] }; update(); }));
}
const LVCOL = { low: "var(--teal)", medium: "var(--amber)", high: "var(--coral)" };
function renderCoach() {
  const p = lastPlan = coach(S), st = p.stress;
  $("#stressN").textContent = st.total;
  const arc = $("#ringArc"); arc.style.stroke = LVCOL[st.level]; arc.setAttribute("stroke-dashoffset", (389.6 * (1 - Math.max(st.total, 3) / 100)).toFixed(1));
  $("#mood").textContent = t("lv_" + st.level); $("#mood").style.color = LVCOL[st.level];
  let title, sub;
  if (p.kind === "storage") {
    title = p.mode === "drive_down" ? t("m_drive_down") : p.mode === "none" ? t("m_none") : t("m_storage_ac");
    sub = t("s_store", { d: S.storageDays });
  } else if (p.mode === "ac") {
    title = t("m_ac", { kw: S.acKW, t: p.target });
    sub = p.startInH > 0.05 ? t("s_ac_sched", { start: clockAt(p.startInH), end: clockAt(p.startInH + p.durations.acH), km: S.tripKm }) : t("s_ac_now", { dur: dur(p.durations.acH), km: S.tripKm });
  } else if (p.mode === "dc") {
    title = t("m_dc", { t: p.target }); sub = t("s_dc", { min: Math.round(p.durations.dcMin), km: S.tripKm });
  } else if (p.tips.some(x => x.code === "find_charger")) { title = t("m_find"); sub = ""; }
  else { title = t("m_none"); sub = t("s_none", { soc: S.soc, km: S.tripKm, need: p.needSoc }); }
  $("#recoTitle").textContent = title; $("#recoSub").textContent = sub;
  // compare
  const c = p.compare, cmp = $("#cmp");
  if (c && p.kind !== "storage") {
    const card = (key, o, extra) => `<div class="opt${p.mode === key ? " best" : ""}"><div class="t"><span>${t("opt_" + key)}</span>${p.mode === key ? `<i>${t("best")}</i>` : ""}</div>
      <div class="v">${extra}</div><div class="small">${t("stress_word")} ${o.stress.total}/100</div><div class="bar"><b style="width:${o.stress.total}%;background:${LVCOL[o.stress.level]}"></b></div></div>`;
    cmp.innerHTML = card("ac", c.ac, dur(c.ac.hours) + (c.ac.fits ? "" : ` <span class="small warn">· ${t("not_fit")}</span>`)) + card("dc", c.dc, t("mins", { m: Math.round(c.dc.minutes) }));
    cmp.style.display = "";
  } else cmp.style.display = "none";
  $("#factors").innerHTML = st.parts.length ? st.parts.map(x => `<span class="factor">${t("fx_" + x.code)} +${x.v}</span>`).join("") : `<span class="small">${t("fx_none")}</span>`;
  const icons = { heat_shade: "☀", dc_heat: "☀", cold_precondition: "❄", cold_no_precondition: "❄", cold_plugged: "❄", schedule_finish: "⏰", dc_stop80: "⚡", storage_50: "🧳" };
  $("#tips").innerHTML = p.tips.map(x => `<li><i>${icons[x.code] || "✓"}</i><span>${t("tip_" + x.code, { hours: fmt(x.hours ?? 0, 1), t: p.target })}</span></li>`).join("");
  renderScenarioChips();
}
function update() { syncForm(); renderCoach(); $("#aiOut").innerHTML = `<p class="small">${t("ai_hint")}</p>`; }

function context() {
  return { lang: LANG, scenario: S, plan: lastPlan && { kind: lastPlan.kind, mode: lastPlan.mode, target_percent: lastPlan.target, needed_percent: lastPlan.needSoc, start_in_hours: +lastPlan.startInH.toFixed(2), durations: lastPlan.durations, stress_index: lastPlan.stress.total, stress_level: lastPlan.stress.level, stress_contributors: lastPlan.stress.parts, tips: lastPlan.tips.map(x => x.code) },
    health_check: lastHealth };
}
$("#adviseBtn").onclick = async () => {
  if (!aiReady()) return explainAI();
  const out = $("#aiOut"), btn = $("#adviseBtn");
  btn.disabled = true; out.innerHTML = `<p class="small"><span class="spin"></span></p>`;
  try {
    const a = await SRV.advise(context());
    const esc = s => String(s).replace(/[&<>]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[ch]));
    out.innerHTML = `<h4>${esc(a.headline)}</h4><ol>${(a.actions || []).map(x => `<li>${esc(x)}</li>`).join("")}</ol><p><b>${t("a_why")}:</b> ${esc(a.why)}</p>${a.watch_out ? `<p class="warn">⚠ ${esc(a.watch_out)}</p>` : ""}`;
  } catch (e) { out.innerHTML = `<p class="warn">${aiErr(e)}</p>`; }
  finally { btn.disabled = false; }
};

/* ---------------- health check ---------------- */
let MODEL = null, INDEX = null, SEL = "A", userRows = null, running = false, lastRun = null;
const SESSIONS = {};
async function loadModel() {
  [MODEL, INDEX] = await Promise.all([fetch("model.json").then(r => r.json()), fetch("samples/index.json").then(r => r.json())]);
  renderSamples();
}
async function sessionRows(id) {
  if (id === "U") return userRows;
  if (!SESSIONS[id]) SESSIONS[id] = (await (await fetch(`samples/session_${id}.json`)).json()).rows;
  return SESSIONS[id];
}
function renderSamples() {
  if (!INDEX) return;
  const items = INDEX.sessions.map(s => ({ id: s.id, name: t("s_" + s.id), desc: s.id === "E" ? t("sd_E") : t("sd_A") }));
  if (userRows) items.push({ id: "U", name: t("s_U"), desc: t("sd_U", { n: userRows.length }) });
  $("#samples").innerHTML = items.map(s => `<button class="sample${s.id === SEL ? " on" : ""}" data-id="${s.id}"><span class="ic">${s.id === "U" ? "↑" : s.id === "E" ? "A" : s.id}</span><span><b>${s.name}</b><span>${s.desc}</span></span></button>`).join("");
  document.querySelectorAll(".sample").forEach(b => (b.onclick = () => { SEL = b.dataset.id; lastRun = null; renderSamples(); renderHealth(); drawChart(null, 0); }));
  $("#runBtn").textContent = running ? t("running") : t("run");
}
$("#file").onchange = async e => {
  const f = e.target.files[0]; if (!f) return;
  userRows = parseLog(await f.text()); SEL = "U"; lastRun = null; renderSamples(); renderHealth();
};
$("#tmpl").onclick = async e => {
  e.preventDefault();
  const rows = (await sessionRows("A")).filter(r => r[0] <= 900);
  const blob = new Blob(["elapsed_s,voltage_V,current_A\n" + rows.map(r => r.join(",")).join("\n")], { type: "text/csv" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "batterytruth_charging_log_template.csv"; a.click();
};

async function assess(rows) {
  if (ACC.server?.model_available) {
    try { return { ...(await SRV.healthCheck(rows)), engine: "server" }; } catch {}
  }
  return { ...runSession(MODEL, rows), engine: "browser" };
}

function drawChart(rows, upto, res) {
  const svg = $("#chart"), W = 720, H = 260, L = 46, R = 704, T0 = 30, B = 220, MAXT = 2400;
  const vs = rows && rows.length ? rows.map(r => r[1]) : [3, 3.6];
  const vmin = Math.floor((Math.min(...vs) - 0.02) * 20) / 20, vmax = Math.ceil((Math.max(...vs) + 0.02) * 20) / 20;
  const X = s => L + (R - L) * Math.min(s, MAXT) / MAXT, Y = v => B - (B - T0) * (v - vmin) / (vmax - vmin || 1);
  let g = `<g font-size="12" fill="var(--dim)">`;
  for (const m of [0, 5, 10, 15, 20, 30, 40]) g += `<line x1="${X(m * 60)}" y1="${T0}" x2="${X(m * 60)}" y2="${B}" stroke="var(--line)"/><text x="${X(m * 60)}" y="${B + 18}" text-anchor="middle">${m}′</text>`;
  for (let k = 0; k <= 3; k++) { const v = vmin + (vmax - vmin) * k / 3; g += `<text x="${L - 8}" y="${Y(v) + 4}" text-anchor="end">${fmt(v, 2)}</text>`; }
  g += `<text x="${L - 30}" y="${T0 - 14}" text-anchor="start">V</text></g>`;
  if (rows && rows.length) {
    const pts = []; const step = Math.max(1, Math.floor(rows.length / 400));
    for (let k = 0; k < rows.length && rows[k][0] <= upto; k += step) pts.push(`${X(rows[k][0]).toFixed(1)},${Y(rows[k][1]).toFixed(1)}`);
    if (pts.length > 1) g += `<polyline points="${pts.join(" ")}" fill="none" stroke="var(--teal)" stroke-width="3" stroke-linejoin="round"/>`;
    if (res?.at && upto >= res.at.budget_s) g += `<line x1="${X(res.at.budget_s)}" y1="${T0}" x2="${X(res.at.budget_s)}" y2="${B}" stroke="var(--teal)" stroke-dasharray="5 5" stroke-width="2"/><rect x="${X(res.at.budget_s)}" y="${T0}" width="${R - X(res.at.budget_s)}" height="${B - T0}" fill="var(--teal)" opacity=".06"/>`;
  }
  svg.innerHTML = g;
  $("#clock").textContent = `${Math.floor(upto / 60)}:${String(Math.floor(upto % 60)).padStart(2, "0")}`;
}

function renderHealth() {
  $("#engineBadge").innerHTML = `<span class="dot on"></span>${ACC.server?.model_available ? t("eng_server") : t("eng_browser")}`;
  const v = $("#verdict"), res = lastRun;
  v.className = "verdict"; $("#range").style.display = "none"; $("#vTruth").textContent = "";
  if (!res) { $("#vTitle").textContent = "—"; $("#vText").textContent = t("v_idle"); $("#log").innerHTML = ""; $("#tbl").innerHTML = ""; $("#progTxt").textContent = ""; return; }
  const shown = res.shown ?? res.checkpoints.length;
  $("#log").innerHTML = res.checkpoints.slice(0, shown).map(c => `<li><b>${c.budget_s / 60} ${t("min")}</b><span>${fmt(c.lo)} – ${fmt(c.hi)} Ah</span><span class="badge ${c.enough ? "ok" : "no"}">${c.enough ? t("cp_enough") : c.supported ? t("cp_wide") : t("cp_out")}</span></li>`).join("");
  $("#tbl").innerHTML = `<tr><th>${t("th_t")}</th><th>${t("th_p")}</th><th>${t("th_r")}</th><th>${t("th_s")}</th></tr>` + res.checkpoints.map(c => `<tr><td>${c.budget_s / 60} ${t("min")}</td><td>${fmt(c.point)}</td><td>${fmt(c.lo)} – ${fmt(c.hi)}</td><td>${c.supported ? "✓" : "—"}</td></tr>`).join("");
  if (!res.done) { $("#vTitle").textContent = t("running"); $("#vText").textContent = ""; return; }
  if (res.decision === "report") {
    v.classList.add("report"); $("#vTitle").textContent = t("v_report", { lo: fmt(res.at.lo), hi: fmt(res.at.hi) });
    $("#vText").textContent = t("v_report_t", { m: res.at.budget_s / 60 });
    const meta = INDEX.sessions.find(s => s.id === SEL);
    const lo = Math.min(res.at.lo, meta?.lab_capacity_Ah ?? res.at.lo) - 0.4, hi = Math.max(res.at.hi, meta?.lab_capacity_Ah ?? res.at.hi) + 0.4;
    const P = x => ((x - lo) / (hi - lo) * 100).toFixed(2) + "%";
    let html = `<div class="ax"></div><div class="band" style="left:${P(res.at.lo)};width:calc(${P(res.at.hi)} - ${P(res.at.lo)})"></div><div class="pt" style="left:${P(res.at.point)}"></div>`;
    for (let k = Math.ceil(lo * 2) / 2; k <= hi; k += 0.5) html += `<div class="tk" style="left:${P(k)}">${fmt(k, 1)} Ah</div>`;
    if (meta && SEL !== "U") { html += `<div class="tr" style="left:${P(meta.lab_capacity_Ah)}"></div>`; const tv = meta.lab_capacity_Ah, ok = tv >= res.at.lo && tv <= res.at.hi, miss = Math.max(res.at.lo - tv, tv - res.at.hi); $("#vTruth").innerHTML = `<span style="color:var(--amber)">▍</span> ${t("truth", { v: fmt(tv, 3), ok: ok ? t("inside") : t("outside", { d: miss < 0.001 ? "< " + fmt(0.001, 3) : fmt(miss, 3) }) })}`; }
    $("#range").innerHTML = html; $("#range").style.display = "";
  } else {
    v.classList.add("no");
    const k = res.decision === "not_enough_data" ? "short" : res.decision === "incompatible" ? (res.reason === "too_short" ? "short" : "incompat") : "na";
    $("#vTitle").textContent = t("v_" + k); $("#vText").textContent = t("v_" + k + "_t");
  }
}

$("#runBtn").onclick = async () => {
  if (running) return;
  const rows = await sessionRows(SEL); if (!rows) return;
  running = true; renderSamples();
  const res = await assess(rows);
  res.done = false; res.shown = 0; lastRun = res; renderHealth();
  const end = res.decision === "report" ? Math.min(rows[rows.length - 1][0], 2400) : Math.min(rows[rows.length - 1][0], 2400);
  const T = 5200, t0 = performance.now();
  await new Promise(done => {
    const step = now => {
      const f = Math.min(1, (now - t0) / T), up = end * (1 - Math.pow(1 - f, 2));
      res.shown = res.checkpoints.filter(c => c.budget_s <= up).length;
      drawChart(rows, up, res); renderHealth();
      if (f < 1) requestAnimationFrame(step); else done();
    };
    requestAnimationFrame(step);
  });
  res.done = true; res.shown = res.checkpoints.length; running = false;
  lastHealth = res.decision === "report" ? { result: "reported", capacity_range_Ah: [+res.at.lo.toFixed(2), +res.at.hi.toFixed(2)], minutes_of_charging: res.at.budget_s / 60 } : { result: res.decision, reason: res.reason };
  renderSamples(); renderHealth();
};

/* ---------------- chat ---------------- */
const CHAT = [];
function renderChat() {
  const box = $("#msgs"); const esc = s => String(s).replace(/[&<>]/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[ch]));
  box.innerHTML = `<div class="m a">${esc(t("hello"))}</div>` + CHAT.map(m => `<div class="m ${m.role === "user" ? "u" : m.role === "error" ? "e" : "a"}">${m.pending ? '<span class="spin"></span>' : esc(m.content)}</div>`).join("");
  box.scrollTop = box.scrollHeight;
}
function renderSugg() {
  $("#sugg").innerHTML = ["q1", "q2", "q3", "q4"].map(k => `<button class="chip" type="button">${t(k)}</button>`).join("");
  document.querySelectorAll("#sugg .chip").forEach(c => (c.onclick = () => ask(c.textContent)));
}
async function ask(text) {
  text = text.trim(); if (!text) return;
  if (!aiReady()) { CHAT.push({ role: "user", content: text }, { role: "error", content: aiBlockedMsg() }); renderChat(); if (ACC.server && !ACC.profile) openWelcome(); return; }
  CHAT.push({ role: "user", content: text }); const pending = { role: "assistant", content: "", pending: true }; CHAT.push(pending); renderChat();
  $("#askIn").value = ""; $("#askBtn").disabled = true;
  const history = CHAT.filter(m => (m.role === "user" || m.role === "assistant") && !m.pending).map(m => ({ role: m.role, content: m.content }));
  try { pending.content = await SRV.chat(context(), history); pending.pending = false; }
  catch (e) { CHAT.splice(CHAT.indexOf(pending), 1); CHAT.push({ role: "error", content: aiErr(e) }); }
  $("#askBtn").disabled = false; renderChat();
}
$("#askForm").onsubmit = e => { e.preventDefault(); ask($("#askIn").value); };

/* ---------------- boot ---------------- */
applyTheme();
const startTab = (location.hash || "#coach").slice(1);
if (q.scenario && SCENARIOS[q.scenario]) { activeScenario = q.scenario; S = { ...DEFAULT_SCENARIO, ...SCENARIOS[q.scenario] }; }
bindForm(); syncForm(); applyLang();
show(["coach", "health", "log", "chat"].includes(startTab) ? startTab : "coach");
await loadModel(); drawChart(null, 0); renderHealth();
initAccount();
if (q.sample && q.autorun) { SEL = q.sample; renderSamples(); $("#runBtn").click(); }
