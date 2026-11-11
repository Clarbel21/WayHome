#include "watch_ui.h"
#include "watch_state.h"
#include "watch_hal.h"
#include "ble_service.h"

// WayHome watch UI, mirroring the web app's wearer screen
// (src/components/Wearable.tsx + src/upgrade.css "wearer home hierarchy"):
// warm cream background, sage/forest palette, big rounded tiles.
namespace {

// Palette from the web app (src/stage.css :root + upgrade.css tile rules).
constexpr uint32_t CREAM = 0xf7f7eb;       // .watch-screen background
constexpr uint32_t INK = 0x172d25;         // --wh-ink
constexpr uint32_t FOREST = 0x28483b;      // --wh-forest
constexpr uint32_t FOREST_LIGHT = 0x2e6545; // primary tile gradient start
constexpr uint32_t SAGE_TEXT = 0x4f6658;   // .wos-orientation
constexpr uint32_t MUTED = 0x6e8061;       // .watch-label
constexpr uint32_t PALE = 0xe7ecdc;        // --wh-pale (secondary buttons)
constexpr uint32_t SUBTLE = 0xe8f0e7;      // primary tile subtitle
constexpr uint32_t PEACH = 0xf3e5d8;       // .family tile
constexpr uint32_t PEACH_TEXT = 0x64391f;
constexpr uint32_t LAVENDER = 0xe3e1f4;    // .talk tile
constexpr uint32_t LAVENDER_TEXT = 0x383376;
constexpr uint32_t MINT = 0xdcece5;        // .wos-home-memory tile
constexpr uint32_t MINT_TEXT = 0x174f43;
constexpr uint32_t SOS_BG = 0xf1e3dc;      // .sos-hold
constexpr uint32_t SOS_TEXT = 0x9f464f;
constexpr uint32_t SOS_BORDER = 0xe4beb9;
constexpr uint32_t SOS_HOLD_BG = 0xc96d72; // .sos-hold.holding
constexpr uint32_t SOS_LIVE = 0x9f343e;    // --wh-emergency (SOS screen)
constexpr uint32_t OK_GREEN = 0x22a06b;    // connection dot
constexpr uint32_t SURFACE = 0xfffefa;     // --wh-surface

constexpr int32_t SCREEN_W = 410;
constexpr int32_t SCREEN_H = 502;

lv_obj_t *scrHome = nullptr;
lv_obj_t *scrRoute = nullptr;
lv_obj_t *scrCall = nullptr;
lv_obj_t *scrTalk = nullptr;
lv_obj_t *scrMemories = nullptr;
lv_obj_t *scrMore = nullptr;
lv_obj_t *scrSettings = nullptr;
lv_obj_t *scrSos = nullptr;
lv_obj_t *scrCheckQ = nullptr;  // "How are you feeling?"
lv_obj_t *scrCheckH = nullptr;  // "How can I help?" (after "I'd like some help")
lv_obj_t *scrThanks = nullptr;  // acknowledged: "Thank you for telling me"
lv_obj_t *scrMirror = nullptr;  // generic: web shows a screen the watch lacks

// Home widgets
lv_obj_t *lblClock = nullptr;
lv_obj_t *lblName = nullptr;
lv_obj_t *lblBattery = nullptr;
lv_obj_t *lblBatteryIcon = nullptr;
lv_obj_t *dotBle = nullptr;
lv_obj_t *lblHello = nullptr;
lv_obj_t *sosBtn = nullptr;
lv_obj_t *sosHoldBar = nullptr;
lv_obj_t *lblSosTitle = nullptr;
lv_obj_t *lblSosHint = nullptr;

// Route widgets
lv_obj_t *lblRouteProgress = nullptr;
lv_obj_t *barRoute = nullptr;
lv_obj_t *lblArrived = nullptr;

// Settings widgets
lv_obj_t *btnAttachment[3] = {nullptr, nullptr, nullptr};

// SOS hold tracking (matches the wearer's request: hold 3 seconds to send)
constexpr uint32_t SOS_HOLD_MS = 3000;
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

lv_obj_t *add_button(lv_obj_t *parent, int32_t x, int32_t y, int32_t w, int32_t h,
                     uint32_t bg, int32_t radius) {
  lv_obj_t *btn = lv_button_create(parent);
  lv_obj_set_pos(btn, x, y);
  lv_obj_set_size(btn, w, h);
  lv_obj_set_style_bg_color(btn, lv_color_hex(bg), 0);
  lv_obj_set_style_radius(btn, radius, 0);
  lv_obj_set_style_border_width(btn, 0, 0);
  lv_obj_set_style_shadow_width(btn, 0, 0);
  return btn;
}

void load_screen(lv_obj_t *scr) { lv_scr_load(scr); }

void trigger_sos() {
  watch.sosActive = true;
  ble::publishSos();
  load_screen(scrSos);
}

// --- Home screen pieces (mirroring .wos-home in upgrade.css) ---

void refresh_route_widgets() {
  static char buf[24];
  snprintf(buf, sizeof(buf), "%u / 6", (unsigned)watch.gpsProgress);
  lv_label_set_text(lblRouteProgress, buf);
  lv_bar_set_value(barRoute, watch.gpsProgress * 100 / 6, LV_ANIM_OFF);
  lv_obj_set_style_text_opa(lblArrived, watch.gpsProgress >= 6 ? LV_OPA_COVER : LV_OPA_TRANSP, 0);
}

void refresh_attachment_buttons() {
  for (int i = 0; i < 3; i++) {
    bool selected = ((uint8_t)watch.attachment() == i);
    lv_obj_set_style_bg_color(btnAttachment[i],
                              lv_color_hex(selected ? FOREST : PALE), 0);
    lv_obj_set_style_text_color(btnAttachment[i],
                                lv_color_hex(selected ? SURFACE : FOREST), 0);
  }
}

const char *battery_symbol(uint8_t percent) {
  if (percent > 80) return LV_SYMBOL_BATTERY_FULL;
  if (percent > 60) return LV_SYMBOL_BATTERY_3;
  if (percent > 40) return LV_SYMBOL_BATTERY_2;
  if (percent > 20) return LV_SYMBOL_BATTERY_1;
  return LV_SYMBOL_BATTERY_EMPTY;
}

void sos_set_holding_visual(bool holding) {
  lv_obj_set_style_bg_color(sosBtn, lv_color_hex(holding ? SOS_HOLD_BG : SOS_BG), 0);
  lv_obj_set_style_text_color(lblSosTitle, lv_color_hex(holding ? SURFACE : SOS_TEXT), 0);
  lv_obj_set_style_text_color(lblSosHint, lv_color_hex(holding ? SURFACE : SOS_TEXT), 0);
  lv_obj_set_style_bg_color(sosHoldBar, lv_color_hex(holding ? 0xa44f56 : SOS_BORDER), 0);
}

// Sprout mascot avatar: sage disc with a two-leaf sprout.
lv_obj_t *make_sprout_avatar(lv_obj_t *parent, int32_t x, int32_t y,
                             int32_t size) {
  lv_obj_t *avatar = lv_obj_create(parent);
  lv_obj_set_pos(avatar, x, y);
  lv_obj_set_size(avatar, size, size);
  lv_obj_set_style_radius(avatar, LV_RADIUS_CIRCLE, 0);
  lv_obj_set_style_bg_color(avatar, lv_color_hex(PALE), 0);
  lv_obj_set_style_border_width(avatar, 0, 0);
  lv_obj_set_style_pad_all(avatar, 0, 0);
  lv_obj_clear_flag(avatar, LV_OBJ_FLAG_SCROLLABLE);

  // Internals scale with the disc (the 46px original: stem 4x16 at 21,20;
  // leaves 14x9 at 6/26,12).
  int32_t stemW = size * 4 / 46, stemH = size * 16 / 46;
  int32_t stemX = size * 21 / 46, stemY = size * 20 / 46;
  int32_t leafW = size * 14 / 46, leafH = size * 9 / 46;
  int32_t leafY = size * 12 / 46;
  int32_t leafLX = size * 6 / 46, leafRX = size * 26 / 46;
  int32_t leafRadius = size * 5 / 46;

  lv_obj_t *stem = lv_obj_create(avatar);
  lv_obj_set_pos(stem, stemX, stemY);
  lv_obj_set_size(stem, stemW, stemH);
  lv_obj_set_style_radius(stem, stemW / 2, 0);
  lv_obj_set_style_bg_color(stem, lv_color_hex(FOREST), 0);
  lv_obj_set_style_border_width(stem, 0, 0);

  lv_obj_t *leafL = lv_obj_create(avatar);
  lv_obj_set_pos(leafL, leafLX, leafY);
  lv_obj_set_size(leafL, leafW, leafH);
  lv_obj_set_style_radius(leafL, leafRadius, 0);
  lv_obj_set_style_bg_color(leafL, lv_color_hex(FOREST_LIGHT), 0);
  lv_obj_set_style_border_width(leafL, 0, 0);
  lv_obj_set_style_transform_rotation(leafL, 3200, 0);

  lv_obj_t *leafR = lv_obj_create(avatar);
  lv_obj_set_pos(leafR, leafRX, leafY);
  lv_obj_set_size(leafR, leafW, leafH);
  lv_obj_set_style_radius(leafR, leafRadius, 0);
  lv_obj_set_style_bg_color(leafR, lv_color_hex(FOREST_LIGHT), 0);
  lv_obj_set_style_border_width(leafR, 0, 0);
  lv_obj_set_style_transform_rotation(leafR, 3800, 0);
  return avatar;
}

// ---- Event callbacks ----

// Home buttons: 0 = Help me home (route), 1 = My memories, 2 = More choices.
void tile_cb(lv_event_t *e) {
  if (lv_event_get_code(e) != LV_EVENT_CLICKED) return;
  int which = (int)(intptr_t)lv_event_get_user_data(e);
  switch (which) {
    case 0:
      // Tell the web app to start guided return (it applies its own
      // safety gates); the watch opens the route screen right away.
      ble::publishCheckIn(0x06, 0);
      refresh_route_widgets();
      load_screen(scrRoute);
      break;
    case 1: load_screen(scrMemories); break;
    default: load_screen(scrMore); break;
  }
}

// More screen: 0 = Call someone I trust, 1 = Let's talk, 2 = Settings.
void more_cb(lv_event_t *e) {
  if (lv_event_get_code(e) != LV_EVENT_CLICKED) return;
  int which = (int)(intptr_t)lv_event_get_user_data(e);
  switch (which) {
    case 0: load_screen(scrCall); break;
    case 1: load_screen(scrTalk); break;
    default:
      refresh_attachment_buttons();
      load_screen(scrSettings);
      break;
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
    // No gps notify here: guided-return steps on the web must pass its
    // safety gates, so the web reacts to the companion command instead.
    ble::syncGpsValue();
    ble::publishCheckIn(0x07, watch.gpsProgress);
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

// Check-in answers, mirroring the web store's answerCheckIn/chooseAssistance
// flow (src/store.ts) — the web resolves the same states from our BLE notify.
void checkin_okay_cb(lv_event_t *e) {
  LV_UNUSED(e);
  ble::publishCheckIn(0x02, 0);
  load_screen(scrHome);
}

void checkin_help_cb(lv_event_t *e) {
  LV_UNUSED(e);
  ble::publishCheckIn(0x03, 0);
  load_screen(scrCheckH);
}

void checkin_assist_cb(lv_event_t *e) {
  int which = (int)(intptr_t)lv_event_get_user_data(e);
  ble::publishCheckIn(0x04, (uint8_t)which);
  load_screen(scrHome);
}

void checkin_back_cb(lv_event_t *e) {
  LV_UNUSED(e);
  ble::publishCheckIn(0x05, 0);
  load_screen(scrCheckQ);
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
    sos_set_holding_visual(true);
  } else if (code == LV_EVENT_RELEASED || code == LV_EVENT_PRESS_LOST) {
    // Releasing early cancels; the 2 s trigger fires from the timer.
    sosHolding = false;
    lv_bar_set_value(sosHoldBar, 0, LV_ANIM_OFF);
    sos_set_holding_visual(false);
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
    sos_set_holding_visual(false);
    trigger_sos();
  }
}

void clock_timer_cb(lv_timer_t *timer) {
  LV_UNUSED(timer);
  lv_label_set_text(lblClock, hal_clock_text());
}

// ---- Screen construction ----

void build_home_screen() {
  scrHome = new_screen(CREAM);

  // Status bar (.watch-status): time | companion name | dot + battery
  lblClock = add_label(scrHome, "--:--", &lv_font_montserrat_16, INK);
  lv_obj_align(lblClock, LV_ALIGN_TOP_LEFT, 16, 10);

  lblName = add_label(scrHome, "Sprout", &lv_font_montserrat_16, SAGE_TEXT);
  lv_obj_align(lblName, LV_ALIGN_TOP_MID, 0, 10);

  lblBattery = add_label(scrHome, "--%", &lv_font_montserrat_14, MUTED);
  lv_obj_align(lblBattery, LV_ALIGN_TOP_RIGHT, -14, 12);

  lblBatteryIcon = add_label(scrHome, LV_SYMBOL_BATTERY_EMPTY, &lv_font_montserrat_16, MUTED);
  lv_obj_align(lblBatteryIcon, LV_ALIGN_TOP_RIGHT, -58, 10);

  dotBle = lv_obj_create(scrHome);
  lv_obj_set_size(dotBle, 11, 11);
  lv_obj_align(dotBle, LV_ALIGN_TOP_RIGHT, -90, 14);
  lv_obj_set_style_radius(dotBle, LV_RADIUS_CIRCLE, 0);
  lv_obj_set_style_bg_color(dotBle, lv_color_hex(0x9aa89b), 0);
  lv_obj_set_style_border_width(dotBle, 0, 0);

  // Mascot + greeting, mirroring the web watch home (mascot, "Hello, <name>.")
  make_sprout_avatar(scrHome, 165, 52, 80);
  lblHello = add_label(scrHome, "Hello.", &lv_font_montserrat_28, INK);
  lv_obj_align(lblHello, LV_ALIGN_TOP_MID, 0, 146);

  // Primary action: Help me home (forest, full width like the web)
  lv_obj_t *goHome = add_button(scrHome, 35, 200, 340, 64, FOREST, 15);
  lv_obj_set_style_bg_grad_color(goHome, lv_color_hex(FOREST_LIGHT), 0);
  lv_obj_set_style_bg_grad_dir(goHome, LV_GRAD_DIR_VER, 0);
  lv_obj_t *goHomeText = add_label(goHome, LV_SYMBOL_HOME "  Help me home",
                                   &lv_font_montserrat_18, SURFACE);
  lv_obj_center(goHomeText);
  lv_obj_add_event_cb(goHome, tile_cb, LV_EVENT_CLICKED, (void *)(intptr_t)0);

  // Secondary outline actions, mirroring the web home order
  lv_obj_t *memories = add_button(scrHome, 35, 280, 340, 56, CREAM, 15);
  lv_obj_set_style_border_color(memories, lv_color_hex(0xcfdcc7), 0);
  lv_obj_set_style_border_width(memories, 1, 0);
  lv_obj_t *memText = add_label(memories, LV_SYMBOL_IMAGE "  My memories",
                                &lv_font_montserrat_16, FOREST);
  lv_obj_center(memText);
  lv_obj_add_event_cb(memories, tile_cb, LV_EVENT_CLICKED, (void *)(intptr_t)1);

  lv_obj_t *more = add_button(scrHome, 35, 348, 340, 56, CREAM, 15);
  lv_obj_set_style_border_color(more, lv_color_hex(0xcfdcc7), 0);
  lv_obj_set_style_border_width(more, 1, 0);
  lv_obj_t *moreText = add_label(more, LV_SYMBOL_LIST "  More choices",
                                 &lv_font_montserrat_16, FOREST);
  lv_obj_center(moreText);
  lv_obj_add_event_cb(more, tile_cb, LV_EVENT_CLICKED, (void *)(intptr_t)2);

  // Long SOS bar across the bottom: hold 3 seconds to send.
  sosBtn = add_button(scrHome, 16, 430, 378, 58, SOS_BG, 14);
  lv_obj_set_style_border_color(sosBtn, lv_color_hex(SOS_BORDER), 0);
  lv_obj_set_style_border_width(sosBtn, 1, 0);
  lblSosTitle = add_label(sosBtn, "SOS", &lv_font_montserrat_20, SOS_TEXT);
  lv_obj_align(lblSosTitle, LV_ALIGN_LEFT_MID, 14, 0);
  lblSosHint = add_label(sosBtn, "Hold for 3 seconds", &lv_font_montserrat_14, SOS_TEXT);
  lv_obj_align(lblSosHint, LV_ALIGN_RIGHT_MID, -14, 0);
  lv_obj_add_event_cb(sosBtn, sos_btn_event_cb, LV_EVENT_PRESSED, nullptr);
  lv_obj_add_event_cb(sosBtn, sos_btn_event_cb, LV_EVENT_RELEASED, nullptr);
  lv_obj_add_event_cb(sosBtn, sos_btn_event_cb, LV_EVENT_PRESS_LOST, nullptr);

  sosHoldBar = lv_bar_create(sosBtn);
  lv_obj_set_size(sosHoldBar, 358, 6);
  lv_obj_align(sosHoldBar, LV_ALIGN_BOTTOM_MID, 0, -4);
  lv_bar_set_range(sosHoldBar, 0, 100);
  lv_obj_set_style_bg_color(sosHoldBar, lv_color_hex(SOS_BORDER), 0);       // track
  lv_obj_set_style_bg_opa(sosHoldBar, LV_OPA_COVER, 0);
  lv_obj_set_style_bg_color(sosHoldBar, lv_color_hex(SOS_LIVE), LV_PART_INDICATOR);
  lv_obj_set_style_radius(sosHoldBar, 3, LV_PART_INDICATOR | LV_STATE_DEFAULT);
}

// More choices screen: the options that moved off the web home.
void build_more_screen() {
  scrMore = new_screen(CREAM);

  lv_obj_t *title = add_label(scrMore, "More choices", &lv_font_montserrat_24, INK);
  lv_obj_align(title, LV_ALIGN_TOP_MID, 0, 40);

  const char *labels[3] = {"Call someone I trust", "Let's talk", "Settings"};
  const char *icons[3] = {LV_SYMBOL_CALL, LV_SYMBOL_ENVELOPE, LV_SYMBOL_SETTINGS};
  for (int i = 0; i < 3; i++) {
    lv_obj_t *btn = add_button(scrMore, 35, 100 + i * 84, 340, 72, PALE, 15);
    lv_obj_t *icon = add_label(btn, icons[i], &lv_font_montserrat_18, FOREST);
    lv_obj_align(icon, LV_ALIGN_LEFT_MID, 18, 0);
    lv_obj_t *text = add_label(btn, labels[i], &lv_font_montserrat_16, FOREST);
    lv_obj_align(text, LV_ALIGN_LEFT_MID, 52, 0);
    lv_obj_add_event_cb(btn, more_cb, LV_EVENT_CLICKED, (void *)(intptr_t)i);
  }

  lv_obj_t *back = add_button(scrMore, 35, 372, 340, 56, PALE, 13);
  lv_obj_t *backText = add_label(back, LV_SYMBOL_LEFT " Back",
                                 &lv_font_montserrat_16, FOREST);
  lv_obj_center(backText);
  lv_obj_add_event_cb(back, back_cb, LV_EVENT_CLICKED, nullptr);
}

void build_route_screen() {
  scrRoute = new_screen(CREAM);

  lv_obj_t *title = add_label(scrRoute, "Going home", &lv_font_montserrat_26, INK);
  lv_obj_align(title, LV_ALIGN_TOP_MID, 0, 34);

  lblRouteProgress = add_label(scrRoute, "0 / 6", &lv_font_montserrat_42, INK);
  lv_obj_align(lblRouteProgress, LV_ALIGN_TOP_MID, 0, 84);

  barRoute = lv_bar_create(scrRoute);
  lv_obj_set_size(barRoute, 340, 16);
  lv_obj_align(barRoute, LV_ALIGN_TOP_MID, 0, 160);
  lv_bar_set_range(barRoute, 0, 100);
  lv_obj_set_style_bg_color(barRoute, lv_color_hex(PALE), 0);
  lv_obj_set_style_bg_opa(barRoute, LV_OPA_COVER, 0);
  lv_obj_set_style_bg_color(barRoute, lv_color_hex(FOREST), LV_PART_INDICATOR);
  lv_obj_set_style_radius(barRoute, 8, LV_PART_INDICATOR | LV_STATE_DEFAULT);

  lv_obj_t *caption = add_label(scrRoute, "Simulated GPS - no real location",
                                &lv_font_montserrat_14, MUTED);
  lv_obj_align(caption, LV_ALIGN_TOP_MID, 0, 190);

  lblArrived = add_label(scrRoute, "You're home " LV_SYMBOL_OK, &lv_font_montserrat_22, MINT_TEXT);
  lv_obj_align(lblArrived, LV_ALIGN_TOP_MID, 0, 226);
  lv_obj_set_style_text_opa(lblArrived, LV_OPA_TRANSP, 0);

  lv_obj_t *walk = add_button(scrRoute, 35, 278, 340, 72, FOREST, 17);
  lv_obj_set_style_bg_grad_color(walk, lv_color_hex(FOREST_LIGHT), 0);
  lv_obj_set_style_bg_grad_dir(walk, LV_GRAD_DIR_VER, 0);
  lv_obj_t *walkText = add_label(walk, "Walk one step", &lv_font_montserrat_18, SURFACE);
  lv_obj_center(walkText);
  lv_obj_add_event_cb(walk, walk_step_cb, LV_EVENT_CLICKED, nullptr);

  lv_obj_t *back = add_button(scrRoute, 35, 370, 340, 56, PALE, 13);
  lv_obj_t *backText = add_label(back, "Back", &lv_font_montserrat_16, FOREST);
  lv_obj_center(backText);
  lv_obj_add_event_cb(back, back_cb, LV_EVENT_CLICKED, nullptr);
}

void build_placeholder_screens() {
  const char *titles[3] = {"Calling family...", "Let's talk", "My memories"};
  const char *captions[3] = {"Simulation - no call is placed",
                             "Coming soon on the watch",
                             "Coming soon on the watch"};
  lv_obj_t **screens[3] = {&scrCall, &scrTalk, &scrMemories};

  for (int i = 0; i < 3; i++) {
    lv_obj_t *scr = new_screen(CREAM);
    lv_obj_t *title = add_label(scr, titles[i], &lv_font_montserrat_26, INK);
    lv_obj_align(title, LV_ALIGN_TOP_MID, 0, 96);
    lv_obj_t *cap = add_label(scr, captions[i], &lv_font_montserrat_14, MUTED);
    lv_obj_align(cap, LV_ALIGN_TOP_MID, 0, 146);

    lv_obj_t *back = add_button(scr, 35, 370, 340, 56, PALE, 13);
    lv_obj_t *backText = add_label(back, "Back", &lv_font_montserrat_16, FOREST);
    lv_obj_center(backText);
    lv_obj_add_event_cb(back, back_cb, LV_EVENT_CLICKED, nullptr);
    *screens[i] = scr;
  }
}

void build_settings_screen() {
  scrSettings = new_screen(CREAM);

  lv_obj_t *title = add_label(scrSettings, "Settings", &lv_font_montserrat_24, INK);
  lv_obj_align(title, LV_ALIGN_TOP_LEFT, 16, 24);

  lv_obj_t *section = add_label(scrSettings, "Attachment", &lv_font_montserrat_14, MUTED);
  lv_obj_align(section, LV_ALIGN_TOP_LEFT, 16, 70);

  const char *names[3] = {"Wristwatch", "Pendant", "Clothing clip"};
  for (int i = 0; i < 3; i++) {
    btnAttachment[i] = add_button(scrSettings, 35, 100 + i * 66, 340, 56, PALE, 13);
    lv_obj_t *text = add_label(btnAttachment[i], names[i], &lv_font_montserrat_16, FOREST);
    lv_obj_center(text);
    lv_obj_add_event_cb(btnAttachment[i], attachment_cb, LV_EVENT_CLICKED,
                        (void *)(intptr_t)i);
  }

  lv_obj_t *about = add_label(scrSettings, "WayHome watch v1", &lv_font_montserrat_14, MUTED);
  lv_obj_align(about, LV_ALIGN_TOP_MID, 0, 320);

  lv_obj_t *back = add_button(scrSettings, 35, 370, 340, 56, PALE, 13);
  lv_obj_t *backText = add_label(back, "Back", &lv_font_montserrat_16, FOREST);
  lv_obj_center(backText);
  lv_obj_add_event_cb(back, back_cb, LV_EVENT_CLICKED, nullptr);
}

void build_sos_screen() {
  scrSos = new_screen(SOS_LIVE);

  lv_obj_t *title = add_label(scrSos, "SOS sent", &lv_font_montserrat_40, SURFACE);
  lv_obj_align(title, LV_ALIGN_TOP_MID, 0, 120);

  lv_obj_t *line1 = add_label(scrSos, "Stay calm. Family has been notified.",
                              &lv_font_montserrat_16, SURFACE);
  lv_obj_align(line1, LV_ALIGN_TOP_MID, 0, 192);

  lv_obj_t *cap = add_label(scrSos, "Emergency simulation - nothing real is sent",
                            &lv_font_montserrat_12, 0xf3d9db);
  lv_obj_align(cap, LV_ALIGN_TOP_MID, 0, 226);

  lv_obj_t *ok = add_button(scrSos, 35, 300, 340, 72, SURFACE, 17);
  lv_obj_t *okText = add_label(ok, "I'm okay now", &lv_font_montserrat_18, SOS_LIVE);
  lv_obj_center(okText);
  lv_obj_add_event_cb(ok, sos_ok_cb, LV_EVENT_CLICKED, nullptr);
}

// Check-in screens (web "Send a check-in"): labels mirror src/i18n.ts.
void build_checkin_screens() {
  // Stage 1: "How are you feeling?" with the two large answers (.wos-answer).
  scrCheckQ = new_screen(CREAM);
  make_sprout_avatar(scrCheckQ, 182, 44, 46);

  lv_obj_t *title = add_label(scrCheckQ, "How are you feeling?",
                              &lv_font_montserrat_24, INK);
  lv_obj_align(title, LV_ALIGN_TOP_MID, 0, 104);

  lv_obj_t *hint = add_label(scrCheckQ, "Take your time. Tap one.",
                             &lv_font_montserrat_14, MUTED);
  lv_obj_align(hint, LV_ALIGN_TOP_MID, 0, 146);

  lv_obj_t *okay = add_button(scrCheckQ, 35, 190, 340, 110, MINT, 17);
  lv_obj_t *okayText = add_label(okay, "I'm okay", &lv_font_montserrat_24, MINT_TEXT);
  lv_obj_center(okayText);
  lv_obj_add_event_cb(okay, checkin_okay_cb, LV_EVENT_CLICKED, nullptr);

  lv_obj_t *help = add_button(scrCheckQ, 35, 320, 340, 110, SOS_BG, 17);
  lv_obj_set_style_border_color(help, lv_color_hex(SOS_BORDER), 0);
  lv_obj_set_style_border_width(help, 1, 0);
  lv_obj_t *helpText = add_label(help, "I'd like some help", &lv_font_montserrat_20, SOS_TEXT);
  lv_obj_center(helpText);
  lv_obj_add_event_cb(help, checkin_help_cb, LV_EVENT_CLICKED, nullptr);

  // Stage 2: "How can I help?" with the three assistance options.
  scrCheckH = new_screen(CREAM);

  lv_obj_t *hTitle = add_label(scrCheckH, "How can I help?",
                               &lv_font_montserrat_24, INK);
  lv_obj_align(hTitle, LV_ALIGN_TOP_MID, 0, 40);

  const char *labels[3] = {"Please guide me home", "Call someone I trust",
                           "I'm not sure where I am"};
  const char *icons[3] = {LV_SYMBOL_HOME, LV_SYMBOL_CALL, LV_SYMBOL_GPS};
  for (int i = 0; i < 3; i++) {
    lv_obj_t *btn = add_button(scrCheckH, 35, 100 + i * 84, 340, 72, PALE, 15);
    lv_obj_t *icon = add_label(btn, icons[i], &lv_font_montserrat_18, FOREST);
    lv_obj_align(icon, LV_ALIGN_LEFT_MID, 18, 0);
    lv_obj_t *text = add_label(btn, labels[i], &lv_font_montserrat_14, FOREST);
    lv_obj_align(text, LV_ALIGN_LEFT_MID, 52, 0);
    lv_obj_add_event_cb(btn, checkin_assist_cb, LV_EVENT_CLICKED,
                        (void *)(intptr_t)i);
  }

  lv_obj_t *back = add_button(scrCheckH, 35, 372, 340, 56, PALE, 13);
  lv_obj_t *backText = add_label(back, LV_SYMBOL_LEFT " Go back",
                                 &lv_font_montserrat_16, FOREST);
  lv_obj_center(backText);
  lv_obj_add_event_cb(back, checkin_back_cb, LV_EVENT_CLICKED, nullptr);
}

// Mirror-only screens for web states the watch has no buttons for.
void build_mirror_screens() {
  // Acknowledged: wearer answered "I'm okay" but safety checks block NORMAL.
  scrThanks = new_screen(CREAM);
  make_sprout_avatar(scrThanks, 182, 60, 46);
  lv_obj_t *tTitle = add_label(scrThanks, "Thank you for telling me.",
                               &lv_font_montserrat_22, INK);
  lv_obj_align(tTitle, LV_ALIGN_TOP_MID, 0, 124);
  lv_obj_t *tNote = add_label(scrThanks,
                              "Your caregiver still needs\nto review the safety concern.",
                              &lv_font_montserrat_16, SAGE_TEXT);
  lv_obj_align(tNote, LV_ALIGN_TOP_MID, 0, 168);
  lv_obj_set_style_text_align(tNote, LV_TEXT_ALIGN_CENTER, 0);
  lv_obj_set_style_text_line_space(tNote, 4, 0);

  // Generic fallback: the web watch shows a screen the firmware lacks.
  scrMirror = new_screen(CREAM);
  lv_obj_t *mTitle = add_label(scrMirror, LV_SYMBOL_HOME " Sprout",
                               &lv_font_montserrat_24, INK);
  lv_obj_align(mTitle, LV_ALIGN_TOP_MID, 0, 150);
  lv_obj_t *mNote = add_label(scrMirror,
                              "Your companion is showing\nsomething new.\n\nCheck the app to respond.",
                              &lv_font_montserrat_16, SAGE_TEXT);
  lv_obj_align(mNote, LV_ALIGN_TOP_MID, 0, 204);
  lv_obj_set_style_text_align(mNote, LV_TEXT_ALIGN_CENTER, 0);
  lv_obj_set_style_text_line_space(mNote, 4, 0);
}

}  // namespace

namespace ui {

bool init() {
  if (lv_display_get_default() == nullptr) return false;

  build_route_screen();
  build_placeholder_screens();
  build_more_screen();
  build_settings_screen();
  build_sos_screen();
  build_checkin_screens();
  build_mirror_screens();
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

  // Screen mirror from the web app: the AMOLED follows the web watch, and
  // its route position is the gate-checked source of truth while guidance
  // runs. Codes mirror src/services/ble.ts watchScreenCode().
  if (watch.watchStatePending) {
    watch.watchStatePending = false;
    uint8_t code = watch.remoteScreen;
    uint8_t pos = watch.remotePosition;
    if (pos != watch.gpsProgress) {
      watch.gpsProgress = pos;
      refresh_route_widgets();
      ble::syncGpsValue();
    }
    if (code != 4) watch.sosActive = false;  // leaving the emergency screen
    switch (code) {
      case 0: load_screen(scrHome); break;
      case 1: load_screen(scrCheckQ); break;
      case 2: load_screen(scrCheckH); break;
      case 3:
        refresh_route_widgets();
        load_screen(scrRoute);
        break;
      case 4:
        watch.sosActive = true;
        load_screen(scrSos);
        break;
      case 5: load_screen(scrThanks); break;
      case 6: load_screen(scrMirror); break;
      default: break;  // 255 = nothing received yet
    }
  }

  // A check-in request (BLE 0x01) takes over the screen, like CHECK_IN mode
  // does on the web — except while an SOS is active, which wins on both ends.
  if (watch.checkInPending) {
    watch.checkInPending = false;
    if (!watch.sosActive) {
      load_screen(scrCheckQ);
    }
  }

  uint8_t batteryNow = watch.batteryValid ? watch.batteryPercent : UINT8_MAX;
  if (batteryNow != lastBattery) {
    lastBattery = batteryNow;
    static char buf[8];
    if (watch.batteryValid) {
      snprintf(buf, sizeof(buf), "%u%%", (unsigned)watch.batteryPercent);
      lv_label_set_text(lblBatteryIcon, battery_symbol(watch.batteryPercent));
      bool low = watch.batteryPercent <= 20;
      lv_obj_set_style_text_color(lblBattery, lv_color_hex(low ? SOS_TEXT : MUTED), 0);
      lv_obj_set_style_text_color(lblBatteryIcon, lv_color_hex(low ? SOS_TEXT : MUTED), 0);
    } else {
      snprintf(buf, sizeof(buf), "--%%");
      lv_label_set_text(lblBatteryIcon, LV_SYMBOL_BATTERY_EMPTY);
    }
    lv_label_set_text(lblBattery, buf);
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
    lv_obj_set_style_bg_color(dotBle,
                              lv_color_hex(watch.bleConnected ? OK_GREEN : 0x9aa89b),
                              0);
  }

  if (watch.wearerNameDirty) {
    watch.wearerNameDirty = false;
    static char hello[32];
    if (watch.wearerName[0] != ' ') {
      snprintf(hello, sizeof(hello), "Hello, %s.", watch.wearerName);
    } else {
      snprintf(hello, sizeof(hello), "Hello.");
    }
    lv_label_set_text(lblHello, hello);
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
