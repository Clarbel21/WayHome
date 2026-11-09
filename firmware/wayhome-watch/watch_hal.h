#pragma once

// Thin hardware-facing hooks the UI needs. Implemented by wayhome-watch.ino.
// Kept as a header so watch_ui.cpp stays independent of the sketch's globals.

// "HH:MM" from the PCF85063 RTC (static buffer, refreshed on call).
const char *hal_clock_text();
