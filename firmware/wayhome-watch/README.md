# WayHome Sprout Watch — ESP32-S3 firmware

Firmware for the [Waveshare ESP32-S3-Touch-AMOLED-2.06](https://www.waveshare.com/ESP32-S3-Touch-AMOLED-2.06.htm)
that turns the board into the WayHome **Sprout wearable**. It runs an LVGL watch UI
and a BLE GATT server that streams the WayHome `DeviceEvent` contract to the web app
over Web Bluetooth.

Everything on this device is a **simulation aid for the educational WayHome demo** —
there is no real GNSS (the board has none), no real calling, and no emergency dispatch.

## Hardware mapping

| Watch function | Hardware |
|---|---|
| UI | 2.06" AMOLED 410×502 (CO5300, QSPI) + FT3168 touch |
| Clock | PCF85063 RTC (flashed from compile time when unset) |
| Battery % | AXP2101 PMIC `getBatteryPercent()` |
| Wear motion | QMI8658 accelerometer (1 g-deviation EMA, debounced) |
| GPS progress | Simulated route steps 0–6 (no GNSS on board) |
| SOS | 2-second hold on the red home-screen button |

## Arduino IDE setup

1. Install the **esp32** board package (tested with **3.3.11**) and
   [NimBLE-Arduino](https://github.com/h2zero/NimBLE-Arduino) (Library Manager, tested 2.5.2).
2. Install the Waveshare board libraries from the
   [vendor repo](https://github.com/waveshareteam/ESP32-S3-Touch-AMOLED-2.06)
   (`examples/arduino/libraries/` → your sketchbook `libraries/` folder, including `lv_conf.h`).
3. Board settings: **ESP32S3 Dev Module**, Flash Size **16MB**, Partition Scheme
   **16M Flash (3MB APP/9.9MB FATFS)**, PSRAM **OPI PSRAM**, USB CDC On Boot **Enabled**.
4. Open `wayhome-watch.ino`, upload, open the serial monitor (USB CDC, 115200).

## BLE protocol

Device name **`Sprout Watch`**. Service and characteristic UUIDs must match
`src/services/ble.ts` in the web app:

| Characteristic | UUID | Payload | Properties |
|---|---|---|---|
| Battery | `5a9c1f2e-4a02-4c31-9a48-d1b7f30e6c21` | `uint8` percent, `0xFF` = no battery | read, notify |
| SOS | `5a9c1f2e-4a03-4c31-9a48-d1b7f30e6c21` | `uint8` trigger (`1`) | read, notify |
| GPS progress | `5a9c1f2e-4a04-4c31-9a48-d1b7f30e6c21` | `uint8` 0–6 route step | read, write, notify |
| Wear motion | `5a9c1f2e-4a05-4c31-9a48-d1b7f30e6c21` | `uint8`: 0 unknown, 1 yes, 2 no | read, notify |
| Attachment | `5a9c1f2e-4a06-4c31-9a48-d1b7f30e6c21` | string `wristwatch\|pendant\|clip` | read, write, notify |
| Companion command | `5a9c1f2e-4a07-4c31-9a48-d1b7f30e6c21` | byte0: web→watch `0x01` show check-in; watch→web `0x02` "I'm okay", `0x03` "I'd like some help", `0x04` assistance (byte1: 0 home, 1 family, 2 confused), `0x05` back, `0x06` "Help me home", `0x07` walked a step (byte1: new step 0–6) | read, write, notify |
| *(service)* | `5a9c1f2e-4a01-4c31-9a48-d1b7f30e6c21` | — | — |

All payloads fit the default 20-byte ATT payload. On connect the device re-pushes a
full snapshot (the web store resets wear observations on reconnect). Wear-motion
notifications are rate-limited to one per minute because the web app logs an alert
for every wear event.

## Pairing with the web app

1. Open the WayHome app (GitHub Pages or `npm run dev` — Web Bluetooth needs HTTPS or localhost; Chrome/Edge/Android only, not iOS Safari).
2. On the demo page (**Wearable configuration**), click **Connect Sprout watch** and pick `Sprout Watch`.
3. Try it: hold the red SOS button for 2 s, walk the route steps, change the attachment
   in Settings, or just shake the watch to flip wear motion.
