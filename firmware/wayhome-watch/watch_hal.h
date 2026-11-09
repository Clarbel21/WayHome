#pragma once

// Thin hardware-facing hooks the UI needs. Implemented by wayhome-watch.ino.
// Kept as a header so watch_ui.cpp stays independent of the sketch's globals.

// "H:MM AM/PM" from the PCF85063 RTC (static buffer, refreshed on call).
const char *hal_clock_text();

// Weekday name ("Monday"...) derived from the RTC date; "" when unknown.
const char *hal_weekday_text();
