#pragma once
#include <lvgl.h>

// WayHome watch UI (LVGL 9). Screens are built once at init and reused;
// ui::sync() applies WatchState changes to widgets from the main loop.
namespace ui {

// Build all screens and load the home screen. Returns false if LVGL
// is not ready (display not created yet).
bool init();

// Apply WatchState changes (battery, BLE state, route progress, attachment,
// clock) to the widgets. Cheap when nothing changed; call from loop().
void sync();

// Screen navigation (also used by SOS trigger logic).
void showHome();
void showRoute();
void showSettings();
void showSos();

}  // namespace ui
