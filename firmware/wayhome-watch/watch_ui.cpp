#include "watch_ui.h"
#include "watch_state.h"
#include "watch_hal.h"
#include "ble_service.h"

// WayHome watch UI. Colors follow the web app's dark slate theme.
namespace {

constexpr uint32_t COLOR_BG = 0x0f172a;      // slate-900
constexpr uint32_t COLOR_PANEL = 0x1e293b;   // slate-800
constexpr uint32_t COLOR_PRIMARY = 0x16a34a; // green-600
constexpr uint32_t COLOR_DANGER = 0xdc2626;  // red-600
constexpr uint32_t COLOR_TEXT = 0xf1f5f9;    // slate-100
constexpr uint32_t COLOR_MUTED = 0x94a3b8;   // slate-400
constexpr uint32_t COLOR_OK = 0x22c55e;      // green-500

constexpr int32_t SCREEN_W = 410;
constexpr int32_t SCREEN_H = 502;

lv_obj_t *scrHome = nullptr;
lv_obj_t *scrRoute = nullptr;
lv_obj_t *scrCall = nullptr;
lv_obj_t *scrTalk = nullptr;
lv_obj_t *scrMemories = nullptr;
lv_obj_t *scrSettings = nullptr;
lv_obj_t *scrSos = nullptr;

// Home widgets
lv_obj_t *lblClock = nullptr;
lv_obj_t *lblBattery = nullptr;
lv_obj_t *lblBleDot = nullptr;
lv_obj_t *sosHoldBar = nullptr;

// Route widgets
lv_obj_t *lblRouteProgress = nullptr;
lv_obj_t *barRoute = nullptr;
lv_obj_t *lblArrived = nullptr;

// Settings widgets
lv_obj_t *btnAttachment[3] = {nullptr, nullptr, nullptr};

// SOS hold tracking (matches the web app's 2-second hold)
constexpr uint32_t SOS_HOLD_MS = 2000;
uint32_t sosPressStart = 0;
bool sosHolding = false;

// Cached state for sync()
uint8_t lastBattery = UINT8_MAX;
uint8_t lastGps = 255;
uint8_t lastAttachment = 255;
bool lastBleConnected = false;

lv_obj_t *new_screen(uint32_t bg) {
  lv_obj_t *scr = lv_obj_create(NULL);
  lv_obj_set_style_bg_color(scr, lv_color_hex(bg), 0);
  return scr;
}

lv_obj_t *add_label(lv_obj_t *parent, const char *text, const lv_font_t *font,
                    uint32_t color) {
  lv_obj_t *lbl = lv_label_create(parent);
  lv_label_set_text(lbl, text);
  lv_obj_set_style_text_font(lbl, font, 0);
  lv_obj_set_style_text_color(lbl, lv_color_hex(color), 0);
  return lbl;
}

lv_obj_t *add_button(lv_obj_t *parent, const char *text, int32_t w, int32_t h,
                     uint32_t bg) {
  lv_obj_t *btn = lv_button_create(parent);
  lv_obj_set_size(btn, w, h);
  lv_obj_set_style_bg_color(btn, lv_color_hex(bg), 0);
  lv_obj_set_style_radius(btn, 16, 0);
  lv_obj_t *lbl = add_label(btn, text, &lv_font_montserrat_16, COLOR_TEXT);
  lv_obj_center(lbl);
  return btn;
}

void load_screen(lv_obj_t *scr) { lv_scr_load(scr); }

void trigger_sos() {
  watch.sosActive = true;
  ble::publishSos();
  load_screen(scrSos);
}

void refresh_route_widgets() {
  static char buf[24];
  snprintf(buf, sizeof(buf), "%u / 6", (unsigned)watch.gpsProgress);
  lv_label_set_text(lblRouteProgress, buf);
  lv_bar_set_value(barRoute, watch.gpsProgress * 100 / 6, LV_ANIM_OFF);
  bool arrived = watch.gpsProgress >= 6;
  lv_obj_set_style_text_opa(lblArrived, arrived ? LV_OPA_COVER : LV_OPA_TRANSP, 0);
}

void refresh_attachment_buttons() {
  for (int i = 0; i < 3; i++) {
    bool selected = ((uint8_t)watch.attachment() == i);
    lv_obj_set_style_bg_color(btnAttachment[i],
                              lv_color_hex(selected ? COLOR_PRIMARY : COLOR_PANEL), 0);
  }
}

// ---- Event callbacks ----

// Home tiles: 0 = Go home (route), 1 = Call family, 2 = Talk, 3 = Memories.
void tile_cb(lv_event_t *e) {
  if (lv_event_get_code(e) != LV_EVENT_CLICKED) return;
  int which = (int)(intptr_t)lv_event_get_user_data(e);
  switch (which) {
    case 0: refresh_route_widgets(); load_screen(scrRoute); break;
    case 1: load_screen(scrCall); break;
    case 2: load_screen(scrTalk); break;
    default: load_screen(scrMemories); break;
  }
}

void back_cb(lv_event_t *e) {
  LV_UNUSED(e);
  load_screen(scrHome);
}

void walk_step_cb(lv_event_t *e) {
  LV_UNUSED(e);
  if (watch.gpsProgress < 6) {
    watch.gpsProgress++;
    ble::publishGps();
    refresh_route_widgets();
  }
}

void attachment_cb(lv_event_t *e) {
  if (lv_event_get_code(e) != LV_EVENT_CLICKED) return;
  int which = (int)(intptr_t)lv_event_get_user_data(e);
  watch.setAttachment((Attachment)which);
  ble::publishAttachment();
  refresh_attachment_buttons();
}

void settings_cb(lv_event_t *e) {
  LV_UNUSED(e);
  refresh_attachment_buttons();
  load_screen(scrSettings);
}

void sos_ok_cb(lv_event_t *e) {
  LV_UNUSED(e);
  watch.sosActive = false;
  load_screen(scrHome);
}

void sos_btn_event_cb(lv_event_t *e) {
  lv_event_code_t code = lv_event_get_code(e);
  if (code == LV_EVENT_PRESSED) {
    sosPressStart = lv_tick_get();
    sosHolding = true;
  } else if (code == LV_EVENT_RELEASED || code == LV_EVENT_PRESS_LOST) {
    // Releasing early cancels; the 2 s trigger fires from the timer.
    sosHolding = false;
    lv_bar_set_value(sosHoldBar, 0, LV_ANIM_OFF);
  }
}

void sos_hold_timer_cb(lv_timer_t *timer) {
  LV_UNUSED(timer);
  if (!sosHolding) return;
  uint32_t held = lv_tick_elaps(sosPressStart);
  lv_bar_set_value(sosHoldBar, LV_MIN(held * 100 / SOS_HOLD_MS, 100), LV_ANIM_OFF);
  if (held >= SOS_HOLD_MS) {
    sosHolding = false;
    lv_bar_set_value(sosHoldBar, 0, LV_ANIM_OFF);
    trigger_sos();
  }
}

void clock_timer_cb(lv_timer_t *timer) {
  LV_UNUSED(timer);
  lv_label_set_text(lblClock, hal_clock_text());
}

// ---- Screen construction ----

void build_status_bar(lv_obj_t *scr) {
  lblClock = add_label(scr, "--:--", &lv_font_montserrat_20, COLOR_TEXT);
  lv_obj_align(lblClock, LV_ALIGN_TOP_LEFT, 16, 14);

  lblBleDot = add_label(scr, LV_SYMBOL_BLUETOOTH, &lv_font_montserrat_16, COLOR_MUTED);
  lv_obj_align(lblBleDot, LV_ALIGN_TOP_RIGHT, -96, 18);

  lblBattery = add_label(scr, "--%", &lv_font_montserrat_16, COLOR_MUTED);
  lv_obj_align(lblBattery, LV_ALIGN_TOP_RIGHT, -16, 18);
}

void build_home_screen() {
  scrHome = new_screen(COLOR_BG);
  build_status_bar(scrHome);

  // 2x2 tiles: Go home / Call family / Talk / Memories (mirrors the web app).
  const char *titles[4] = {"Go home", "Call family", "Talk", "Memories"};
  const uint32_t bgs[4] = {COLOR_PRIMARY, COLOR_PANEL, COLOR_PANEL, COLOR_PANEL};

  constexpr int32_t margin = 12, gap = 10;
  constexpr int32_t tileW = (SCREEN_W - margin * 2 - gap) / 2;  // 194
  constexpr int32_t tileH = 150;

  for (int i = 0; i < 4; i++) {
    lv_obj_t *tile = add_button(scrHome, titles[i], tileW, tileH, bgs[i]);
    int32_t col = i % 2, row = i / 2;
    lv_obj_align(tile, LV_ALIGN_TOP_LEFT, margin + col * (tileW + gap),
                 64 + row * (tileH + gap));
    lv_obj_add_event_cb(tile, tile_cb, LV_EVENT_CLICKED, (void *)(intptr_t)i);
  }

  // Footer: settings + 2-second-hold SOS.
  lv_obj_t *settingsBtn = add_button(scrHome, LV_SYMBOL_SETTINGS, 80, 68, COLOR_PANEL);
  lv_obj_align(settingsBtn, LV_ALIGN_BOTTOM_LEFT, 12, -20);
  lv_obj_add_event_cb(settingsBtn, settings_cb, LV_EVENT_CLICKED, nullptr);

  lv_obj_t *sosBtn = add_button(scrHome, "Hold 2s - SOS", 286, 68, COLOR_DANGER);
  lv_obj_align(sosBtn, LV_ALIGN_BOTTOM_RIGHT, -12, -20);
  lv_obj_add_event_cb(sosBtn, sos_btn_event_cb, LV_EVENT_PRESSED, nullptr);
  lv_obj_add_event_cb(sosBtn, sos_btn_event_cb, LV_EVENT_RELEASED, nullptr);
  lv_obj_add_event_cb(sosBtn, sos_btn_event_cb, LV_EVENT_PRESS_LOST, nullptr);
  // Keep the label clear of the hold-progress bar inside the button.
  lv_obj_set_style_pad_bottom(sosBtn, 14, 0);

  sosHoldBar = lv_bar_create(sosBtn);
  lv_obj_set_size(sosHoldBar, 262, 8);
  lv_obj_align(sosHoldBar, LV_ALIGN_BOTTOM_MID, 0, 4);
  lv_bar_set_range(sosHoldBar, 0, 100);
  lv_obj_set_style_bg_color(sosHoldBar, lv_color_hex(0x7f1d1d), 0);
  lv_obj_set_style_bg_opa(sosHoldBar, LV_OPA_COVER, 0);
}

void build_route_screen() {
  scrRoute = new_screen(COLOR_BG);

  lv_obj_t *title = add_label(scrRoute, "Going home", &lv_font_montserrat_28, COLOR_TEXT);
  lv_obj_align(title, LV_ALIGN_TOP_MID, 0, 36);

  lblRouteProgress = add_label(scrRoute, "0 / 6", &lv_font_montserrat_40, COLOR_TEXT);
  lv_obj_align(lblRouteProgress, LV_ALIGN_TOP_MID, 0, 96);

  barRoute = lv_bar_create(scrRoute);
  lv_obj_set_size(barRoute, 340, 14);
  lv_obj_align(barRoute, LV_ALIGN_TOP_MID, 0, 168);
  lv_bar_set_range(barRoute, 0, 100);

  lv_obj_t *caption = add_label(scrRoute, "Simulated GPS - no real location",
                                &lv_font_montserrat_14, COLOR_MUTED);
  lv_obj_align(caption, LV_ALIGN_TOP_MID, 0, 194);

  lblArrived = add_label(scrRoute, "You're home " LV_SYMBOL_OK, &lv_font_montserrat_24,
                         COLOR_OK);
  lv_obj_align(lblArrived, LV_ALIGN_TOP_MID, 0, 232);
  lv_obj_set_style_text_opa(lblArrived, LV_OPA_TRANSP, 0);

  lv_obj_t *walk = add_button(scrRoute, "Walk one step", 340, 70, COLOR_PRIMARY);
  lv_obj_align(walk, LV_ALIGN_TOP_MID, 0, 286);
  lv_obj_add_event_cb(walk, walk_step_cb, LV_EVENT_CLICKED, nullptr);

  lv_obj_t *back = add_button(scrRoute, "Back", 340, 54, COLOR_PANEL);
  lv_obj_align(back, LV_ALIGN_BOTTOM_MID, 0, -20);
  lv_obj_add_event_cb(back, back_cb, LV_EVENT_CLICKED, nullptr);
}

void build_placeholder_screens() {
  const char *titles[3] = {"Calling family...", "Talk", "Memory Garden"};
  const char *captions[3] = {"Simulation - no call is placed",
                             "Coming soon on the watch",
                             "Coming soon on the watch"};
  lv_obj_t **screens[3] = {&scrCall, &scrTalk, &scrMemories};

  for (int i = 0; i < 3; i++) {
    lv_obj_t *scr = new_screen(COLOR_BG);
    lv_obj_t *title = add_label(scr, titles[i], &lv_font_montserrat_28, COLOR_TEXT);
    lv_obj_align(title, LV_ALIGN_TOP_MID, 0, 90);
    lv_obj_t *cap = add_label(scr, captions[i], &lv_font_montserrat_14, COLOR_MUTED);
    lv_obj_align(cap, LV_ALIGN_TOP_MID, 0, 140);
    lv_obj_t *back = add_button(scr, "Back", 340, 54, COLOR_PANEL);
    lv_obj_align(back, LV_ALIGN_BOTTOM_MID, 0, -20);
    lv_obj_add_event_cb(back, back_cb, LV_EVENT_CLICKED, nullptr);
    *screens[i] = scr;
  }
}

void build_settings_screen() {
  scrSettings = new_screen(COLOR_BG);

  lv_obj_t *title = add_label(scrSettings, "Settings", &lv_font_montserrat_24, COLOR_TEXT);
  lv_obj_align(title, LV_ALIGN_TOP_LEFT, 16, 24);

  lv_obj_t *section =
      add_label(scrSettings, "Attachment", &lv_font_montserrat_14, COLOR_MUTED);
  lv_obj_align(section, LV_ALIGN_TOP_LEFT, 16, 70);

  const char *names[3] = {"Wristwatch", "Pendant", "Clothing clip"};
  for (int i = 0; i < 3; i++) {
    btnAttachment[i] = add_button(scrSettings, names[i], 340, 54, COLOR_PANEL);
    lv_obj_align(btnAttachment[i], LV_ALIGN_TOP_MID, 0, 100 + i * 66);
    lv_obj_add_event_cb(btnAttachment[i], attachment_cb, LV_EVENT_CLICKED,
                        (void *)(intptr_t)i);
  }

  lv_obj_t *about =
      add_label(scrSettings, "WayHome watch v1", &lv_font_montserrat_14, COLOR_MUTED);
  lv_obj_align(about, LV_ALIGN_TOP_MID, 0, 320);

  lv_obj_t *back = add_button(scrSettings, "Back", 340, 54, COLOR_PANEL);
  lv_obj_align(back, LV_ALIGN_BOTTOM_MID, 0, -20);
  lv_obj_add_event_cb(back, back_cb, LV_EVENT_CLICKED, nullptr);
}

void build_sos_screen() {
  scrSos = new_screen(0x450a0a);  // red-950

  lv_obj_t *title = add_label(scrSos, "SOS sent", &lv_font_montserrat_40, COLOR_TEXT);
  lv_obj_align(title, LV_ALIGN_TOP_MID, 0, 120);

  lv_obj_t *line1 = add_label(scrSos, "Stay calm. Family has been notified.",
                              &lv_font_montserrat_16, COLOR_TEXT);
  lv_obj_align(line1, LV_ALIGN_TOP_MID, 0, 190);

  lv_obj_t *cap = add_label(scrSos, "Emergency simulation - nothing real is sent",
                            &lv_font_montserrat_14, COLOR_MUTED);
  lv_obj_align(cap, LV_ALIGN_TOP_MID, 0, 224);

  lv_obj_t *ok = add_button(scrSos, "I'm okay now", 340, 70, COLOR_DANGER);
  lv_obj_align(ok, LV_ALIGN_TOP_MID, 0, 300);
  lv_obj_add_event_cb(ok, sos_ok_cb, LV_EVENT_CLICKED, nullptr);
}

}  // namespace

namespace ui {

bool init() {
  if (lv_display_get_default() == nullptr) return false;

  build_route_screen();
  build_placeholder_screens();
  build_settings_screen();
  build_sos_screen();
  build_home_screen();

  lv_timer_create(sos_hold_timer_cb, 50, nullptr);
  lv_timer_create(clock_timer_cb, 1000, nullptr);

  refresh_route_widgets();
  refresh_attachment_buttons();
  load_screen(scrHome);
  return true;
}

void sync() {
  if (lblBattery == nullptr) return;

  uint8_t batteryNow = watch.batteryValid ? watch.batteryPercent : UINT8_MAX;
  if (batteryNow != lastBattery) {
    lastBattery = batteryNow;
    static char buf[8];
    if (watch.batteryValid) {
      snprintf(buf, sizeof(buf), "%u%%", (unsigned)watch.batteryPercent);
    } else {
      snprintf(buf, sizeof(buf), "--%%");
    }
    lv_label_set_text(lblBattery, buf);
    lv_obj_set_style_text_color(
        lblBattery,
        lv_color_hex(watch.batteryValid && watch.batteryPercent <= 20 ? COLOR_DANGER
                                                                     : COLOR_MUTED),
        0);
  }

  if (watch.gpsProgress != lastGps) {
    lastGps = watch.gpsProgress;
    refresh_route_widgets();
  }

  if ((uint8_t)watch.attachment() != lastAttachment) {
    lastAttachment = (uint8_t)watch.attachment();
    refresh_attachment_buttons();
  }

  if (watch.bleConnected != lastBleConnected) {
    lastBleConnected = watch.bleConnected;
    lv_obj_set_style_text_color(
        lblBleDot, lv_color_hex(watch.bleConnected ? COLOR_OK : COLOR_MUTED), 0);
  }
}

void showHome() { load_screen(scrHome); }

void showRoute() {
  refresh_route_widgets();
  load_screen(scrRoute);
}

void showSettings() {
  refresh_attachment_buttons();
  load_screen(scrSettings);
}

void showSos() { load_screen(scrSos); }

}  // namespace ui
