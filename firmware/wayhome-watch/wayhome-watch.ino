/*
 * WayHome "Sprout" watch firmware
 * Board: Waveshare ESP32-S3-Touch-AMOLED-2.06
 *
 * LVGL watch UI + NimBLE GATT server streaming the WayHome DeviceEvent
 * contract (GPS progress / SOS / battery / wear motion / attachment) to the
 * web app over Web Bluetooth. See firmware/wayhome-watch/README.md.
 *
 * Build settings: ESP32S3 Dev Module, Flash 16MB, Partition
 * "16M Flash (3MB APP/9.9MB FATFS)", PSRAM "OPI PSRAM", USB CDC On Boot "Enabled".
 */

#include <Wire.h>
#include <Arduino.h>
#include "pin_config.h"
#include <lvgl.h>

#include "Arduino_GFX_Library.h"
#include "Arduino_DriveBus_Library.h"
#include "lv_conf.h"

#include "XPowersLib.h"
#include "SensorQMI8658.hpp"
#include "SensorPCF85063.hpp"

#include "HWCDC.h"

#include "watch_state.h"
#include "watch_hal.h"
#include "ble_service.h"
#include "watch_ui.h"

WatchState watch;

HWCDC USBSerial;

uint32_t screenWidth;
uint32_t screenHeight;
uint32_t bufSize;
lv_display_t *disp;
lv_color_t *disp_draw_buf;

#define DIRECT_RENDER_MODE

Arduino_DataBus *bus = new Arduino_ESP32QSPI(
  LCD_CS /* CS */, LCD_SCLK /* SCK */, LCD_SDIO0 /* SDIO0 */, LCD_SDIO1 /* SDIO1 */,
  LCD_SDIO2 /* SDIO2 */, LCD_SDIO3 /* SDIO3 */);

Arduino_GFX *gfx = new Arduino_CO5300(bus, LCD_RESET /* RST */,
                                      0 /* rotation */, LCD_WIDTH, LCD_HEIGHT,
                                      22 /* col_offset1 */,
                                      0 /* row_offset1 */,
                                      0 /* col_offset2 */,
                                      0 /* row_offset2 */);

std::shared_ptr<Arduino_IIC_DriveBus> IIC_Bus =
  std::make_shared<Arduino_HWIIC>(IIC_SDA, IIC_SCL, &Wire);

void Arduino_IIC_Touch_Interrupt(void);

std::unique_ptr<Arduino_IIC> FT3168(new Arduino_FT3x68(IIC_Bus, FT3168_DEVICE_ADDRESS,
                                                       DRIVEBUS_DEFAULT_VALUE, TP_INT, Arduino_IIC_Touch_Interrupt));

void Arduino_IIC_Touch_Interrupt(void) {
  FT3168->IIC_Interrupt_Flag = true;
}

XPowersPMU power;
SensorQMI8658 qmi;
SensorPCF85063 rtc;

bool rtcOk = false;
bool imuOk = false;

// ---- IMU wear-motion detection (1 Hz) ----
// Deviation from 1g, smoothed; sustained stillness reads as "no motion".
constexpr float MOTION_ACTIVE_G = 0.12f;
constexpr uint32_t MOTION_ACTIVE_WINDOW_MS = 45000;  // active in last 45 s => Yes
constexpr uint32_t MOTION_SETTLE_MS = 10000;         // hold off right after boot
constexpr uint32_t MOTION_DEBOUNCE_MS = 60000;       // web logs an alert per wear push
uint32_t bootMs = 0;
uint32_t lastActiveMs = 0;
uint32_t lastWearPushMs = 0;
float motionEma = 0.0f;
bool wearPendingPush = false;

void imu_task_1hz() {
  if (!imuOk) return;
  float x, y, z;
  if (!qmi.getDataReady() || !qmi.getAccelerometer(x, y, z)) return;

  float mag = sqrtf(x * x + y * y + z * z);
  float dev = fabsf(mag - 1.0f);
  motionEma = 0.3f * dev + 0.7f * motionEma;
  if (motionEma > MOTION_ACTIVE_G) lastActiveMs = millis();

  if (millis() - bootMs < MOTION_SETTLE_MS) return;

  WearMotion m =
    (millis() - lastActiveMs < MOTION_ACTIVE_WINDOW_MS) ? WearMotion::Yes : WearMotion::No;
  if (m != watch.wearMotion) {
    watch.wearMotion = m;
    wearPendingPush = true;
  }
  // Rate-limited push so the caregiver alert list does not flood.
  if (wearPendingPush && millis() - lastWearPushMs > MOTION_DEBOUNCE_MS) {
    lastWearPushMs = millis();
    wearPendingPush = false;
    ble::publishWearMotion();
  }
}

// ---- Battery (60 s) ----
void battery_task() {
  bool valid = power.isBatteryConnect();
  uint8_t pct = 0;
  if (valid) {
    int raw = power.getBatteryPercent();
    pct = (uint8_t)constrain(raw, 0, 100);
  }
  bool changed = (valid != watch.batteryValid) ||
                 (valid && abs((int)pct - (int)watch.batteryPercent) >= 2);
  watch.batteryValid = valid;
  watch.batteryPercent = pct;
  watch.charging = power.isCharging();
  if (changed) ble::publishBattery();
}

// ---- RTC ----
void rtc_setup() {
  if (!rtc.begin(Wire, IIC_SDA, IIC_SCL)) {
    USBSerial.println("PCF85063 init failed - clock shows --:--");
    return;
  }
  rtcOk = true;
  RTC_DateTime now = rtc.getDateTime();
  if (now.getYear() < 2024) {
    // Flash an unset RTC from compile time (no NTP yet; demo only).
    const char *months[] = { "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                             "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" };
    int mo = 0;
    for (int i = 0; i < 12; i++) {
      if (strncmp(__DATE__, months[i], 3) == 0) mo = i + 1;
    }
    // __DATE__ is "Mmm dd yyyy" (day space-padded): month 0..2, day 4..5, year 7..10
    rtc.setDateTime((uint16_t)atoi(__DATE__ + 7), (uint8_t)mo, (uint8_t)atoi(__DATE__ + 4),
                    (uint8_t)atoi(__TIME__), (uint8_t)atoi(__TIME__ + 3),
                    (uint8_t)atoi(__TIME__ + 6));
    USBSerial.println("RTC flashed from compile time");
  }
}

const char *hal_clock_text() {
  static char buf[8];
  if (!rtcOk) return "--:--";
  RTC_DateTime dt = rtc.getDateTime();
  snprintf(buf, sizeof(buf), "%02u:%02u", (unsigned)dt.getHour(), (unsigned)dt.getMinute());
  return buf;
}

// ---- LVGL plumbing (from Waveshare example 06) ----

uint32_t millis_cb(void) {
  return millis();
}

void my_disp_flush(lv_display_t *disp, const lv_area_t *area, uint8_t *px_map) {
#ifndef DIRECT_RENDER_MODE
  uint32_t w = lv_area_get_width(area);
  uint32_t h = lv_area_get_height(area);
  gfx->draw16bitRGBBitmap(area->x1, area->y1, (uint16_t *)px_map, w, h);
#endif
  lv_disp_flush_ready(disp);
}

void my_touchpad_read(lv_indev_t *indev, lv_indev_data_t *data) {
  int32_t touchX = FT3168->IIC_Read_Device_Value(FT3168->Arduino_IIC_Touch::Value_Information::TOUCH_COORDINATE_X);
  int32_t touchY = FT3168->IIC_Read_Device_Value(FT3168->Arduino_IIC_Touch::Value_Information::TOUCH_COORDINATE_Y);

  if (FT3168->IIC_Interrupt_Flag == true) {
    FT3168->IIC_Interrupt_Flag = false;
    data->state = LV_INDEV_STATE_PR;
    data->point.x = touchX;
    data->point.y = touchY;
  } else {
    data->state = LV_INDEV_STATE_REL;
  }
}

void rounder_event_cb(lv_event_t *e) {
  lv_area_t *area = (lv_area_t *)lv_event_get_param(e);
  // 2-pixel alignment keeps the QSPI burst writes happy.
  area->x1 = (area->x1 >> 1) << 1;
  area->y1 = (area->y1 >> 1) << 1;
  area->x2 = ((area->x2 >> 1) << 1) + 1;
  area->y2 = ((area->y2 >> 1) << 1) + 1;
}

void setup() {
  USBSerial.begin(115200);
  USBSerial.println("WayHome Sprout watch");

  // Display
  if (!gfx->begin()) {
    USBSerial.println("gfx->begin() failed!");
  }
  gfx->fillScreen(RGB565_BLACK);

  Wire.begin(IIC_SDA, IIC_SCL);

  // Touch
  while (FT3168->begin() == false) {
    USBSerial.println("FT3168 initialization fail");
    delay(2000);
  }
  FT3168->IIC_Write_Device_State(FT3168->Arduino_IIC_Touch::Device::TOUCH_POWER_MODE,
                                 FT3168->Arduino_IIC_Touch::Device_Mode::TOUCH_POWER_MONITOR);

  // PMIC (explicit begin: the shipped example relies on the default ctor)
  if (!power.begin(Wire, AXP2101_SLAVE_ADDRESS, IIC_SDA, IIC_SCL)) {
    USBSerial.println("AXP2101 init failed - battery readings unavailable");
  }
  power.disableIRQ(XPOWERS_AXP2101_ALL_IRQ);
  power.clearIrqStatus();
  power.enableIRQ(XPOWERS_AXP2101_PKEY_SHORT_IRQ);
  power.enableTemperatureMeasure();
  power.enableBattDetection();
  power.enableVbusVoltageMeasure();
  power.enableBattVoltageMeasure();
  power.enableSystemVoltageMeasure();

  // RTC
  rtc_setup();

  // IMU: low-power accelerometer only (gyro off saves power)
  if (qmi.begin(Wire, QMI8658_L_SLAVE_ADDRESS, IIC_SDA, IIC_SCL)) {
    qmi.configAccelerometer(SensorQMI8658::ACC_RANGE_4G,
                            SensorQMI8658::ACC_ODR_LOWPOWER_21Hz,
                            SensorQMI8658::LPF_MODE_0);
    qmi.enableAccelerometer();
    imuOk = true;
  } else {
    USBSerial.println("QMI8658 init failed - wear motion stays unknown");
  }

  // First battery read so BLE reads/notifications start accurate.
  battery_task();

  // BLE GATT server ("Sprout Watch")
  ble::begin();

  // LVGL
  lv_init();
  lv_tick_set_cb(millis_cb);

  screenWidth = gfx->width();
  screenHeight = gfx->height();

#ifdef DIRECT_RENDER_MODE
  bufSize = screenWidth * screenHeight;
#else
  bufSize = screenWidth * 50;
#endif

  disp_draw_buf = (lv_color_t *)heap_caps_malloc(bufSize * 2, MALLOC_CAP_INTERNAL | MALLOC_CAP_8BIT);
  if (!disp_draw_buf) {
    disp_draw_buf = (lv_color_t *)heap_caps_malloc(bufSize * 2, MALLOC_CAP_8BIT);
  }
  if (!disp_draw_buf) {
    USBSerial.println("LVGL disp_draw_buf allocate failed!");
    return;
  }

  disp = lv_display_create(screenWidth, screenHeight);
  lv_display_set_flush_cb(disp, my_disp_flush);
#ifdef DIRECT_RENDER_MODE
  lv_display_set_buffers(disp, disp_draw_buf, NULL, bufSize * 2, LV_DISPLAY_RENDER_MODE_DIRECT);
#else
  lv_display_set_buffers(disp, disp_draw_buf, NULL, bufSize * 2, LV_DISPLAY_RENDER_MODE_PARTIAL);
#endif

  lv_indev_t *indev = lv_indev_create();
  lv_indev_set_type(indev, LV_INDEV_TYPE_POINTER);
  lv_indev_set_read_cb(indev, my_touchpad_read);
  lv_display_add_event_cb(disp, rounder_event_cb, LV_EVENT_INVALIDATE_AREA, NULL);

  // WayHome UI
  ui::init();

  bootMs = millis();
  lastActiveMs = millis();
  USBSerial.println("Setup done");
}

void loop() {
  lv_task_handler();

#ifdef DIRECT_RENDER_MODE
  gfx->draw16bitRGBBitmap(0, 0, (uint16_t *)disp_draw_buf, screenWidth, screenHeight);
#endif

  static uint32_t lastImuMs = 0;
  static uint32_t lastBatteryMs = 0;
  uint32_t now = millis();
  if (now - lastImuMs >= 1000) {
    lastImuMs = now;
    imu_task_1hz();
  }
  if (now - lastBatteryMs >= 60000) {
    lastBatteryMs = now;
    battery_task();
  }

  ble::loopTick();
  ui::sync();

  delay(5);
}
