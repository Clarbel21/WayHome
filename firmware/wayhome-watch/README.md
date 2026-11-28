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
| SOS | 3-second hold on the red home-screen bar |

## Arduino IDE setup

1. Install the **esp32** board package (tested with **3.3.11**) and
   [NimBLE-Arduino](https://github.com/h2zero/NimBLE-Arduino) (Library Manager, tested 2.5.2).
2. Install the Waveshare board libraries from the
   [vendor repo](https://github.com/waveshareteam/ESP32-S3-Touch-AMOLED-2.06)
   (`examples/arduino/libraries/` → your sketchbook `libraries/` folder, including `lv_conf.h`).
   **Important:** replace `libraries/lv_conf.h` with [`firmware/lvgl-config/lv_conf.h`](../lvgl-config/lv_conf.h)
   from this repo. It lets LVGL use the system heap/PSRAM; the vendor default (a 64 KB
   pool) runs out with the WayHome screens and LVGL then freezes the watch (no touch).
   The sketch refuses to compile with the old setting.
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
| Companion command | `5a9c1f2e-4a07-4c31-9a48-d1b7f30e6c21` | byte0: web→watch `0x01` show check-in; watch→web `0x02` "I'm okay", `0x03` "I'd like some help", `0x04` assistance (byte1: 0 home, 1 family, 2 confused), `0x05` back, `0x06` "Help me home", `0x07` "I see it" / walked a step (byte1: new step 0–6), `0x08` "Not yet", `0x09` "I see it now", `0x0A` "I know my way", `0x0B` call a family member (byte1: 0 Jamie, 1 Sam, 2 Mei) | read, write, notify |
| Watch state mirror | `5a9c1f2e-4a08-4c31-9a48-d1b7f30e6c21` | byte0: web watch screen (0 home, 1 check-in question, 2 help options, 3 guided route, 4 emergency, 5 acknowledged, 6 other, 7 "Not yet" during guidance, 8 watch taken off, 17 call ringing, 18 call answered, 19 no answer; 9–16 reserved); byte1: route position 0–6; byte2: landmark stop in bits 0–3 (0–3 select a built-in photo), turn in bits 4–5 (0 straight, 1 left, 2 right), person being called in bits 6–7 (0 none, 1 Jamie, 2 Sam, 3 Mei); bytes 3+: `Wearer\|Companion` first names (ASCII, ≤ 17 bytes) for the "Hi Amy! I'm Momo." greeting | read, write |
| *(service)* | `5a9c1f2e-4a01-4c31-9a48-d1b7f30e6c21` | — | — |

All payloads fit the default 20-byte ATT payload: 3 header bytes + 17 name bytes.
Payloads from older web builds that put the names at byte2 are still parsed; they
simply leave the landmark photo at the first stop. On connect the device re-pushes a
full snapshot (the web store resets wear observations on reconnect). Wear-motion
notifications are rate-limited to one per minute because the web app logs an alert
for every wear event.

### Landmark photos

The four built-in photos are compiled into flash as 360x200 RGB565 LVGL images in
`landmark_images.cpp` (~144 KB each, ~576 KB total). The stop byte selects them in
`initialLandmarks` order from `src/store.ts`:

| Byte2 bits 0–3 | Name | Source SVG |
|---|---|---|
| 0 | Community garden | `public/images/garden.svg` |
| 1 | Neighborhood bakery | `public/images/bakery.svg` |
| 2 | Local library | `public/images/library.svg` |
| 3 | Home | `public/images/home.svg` |

Regenerate them after changing an SVG with
`CHROMIUM_PATH=/path/to/chrome.exe node firmware/tools/make_landmark_images.mjs`.
Caregiver-uploaded photos are not sent over BLE yet.

### Watch taken off

Screen mirror code 8 shows **Put me on?** and keeps the three-second SOS bar.
The **Takes it off** demo control supplies simulated wear observations. The
board reports motion, which does not confirm whether the watch is on a wrist.
Open this sketch in Arduino IDE, verify and upload it before testing mirror
code 8 with the matching web build.

## Pairing with the web app

1. Open the WayHome app (GitHub Pages or `npm run dev` — Web Bluetooth needs HTTPS or localhost; Chrome/Edge/Android only, not iOS Safari).
2. On the demo page (**Wearable configuration**), click **Connect Sprout watch** and pick `Sprout Watch`.
3. Try it: hold the red SOS bar for 3 s, tap the four home tiles, walk the route steps,
   change the attachment in Settings, or just shake the watch to flip wear motion.

## Watch screens (same words as the web watch, `src/i18n.ts`)

| Tile | What happens |
|---|---|
| Home | Sends `0x06`; the web starts guided return and mirrors the route (code 3). |
| Call | Sends `0x04` + `1` (family): the caregiver phone gets the family request. Shows "Calling family" until the web confirms. No real call is placed. |
| Talk | Four topics with Sprout's short replies (on-device, like the web watch). |
| Game | Memory Garden: five gentle prompts, one at a time, with Next and Back. |

Wording follows TEAM_PLAN v5: one idea per screen, at most 3 words per button.

During guided return the route screen shows the current stop's photo on top, the
place name, and **I see it** / **Not yet** / **Back** buttons (text ≥ 15 px, buttons
≥ 44 px). "Not yet" pauses directions on both screens; the watch then shows
**I see it now** and **Call family**.

## Connecting (troubleshooting)

- The watch advertises as **Sprout Watch** with the WayHome service UUID; the web app
  matches either, so it appears in Chrome's Bluetooth picker.
- The web app connects one GATT step at a time (Chrome on Windows/Android rejects
  parallel GATT operations with "GATT operation already in progress").
- If the picker shows nothing: turn Bluetooth on, use Chrome/Edge on desktop or Android,
  open the site over HTTPS (GitHub Pages) or `localhost`, and reset the board so it
  starts advertising again.

## Speaker and call recordings (Call lane C2)

The board has a speaker (ES8311 codec + NS4150B amplifier on GPIO46) and **no vibration
motor**. `watch_audio.cpp` plays a phone ring while a call is ringing (code 17). When the
call is answered (code 18) it plays `/call-0.wav` (Jamie), `/call-1.wav` (Sam) or
`/call-2.wav` (Mei) from the 9.9 MB FAT partition: 16 kHz, 16-bit, mono PCM WAV. If the
file is missing it plays a short chime. Serial Monitor shows `[AUDIO] ...` lines.
Uploading the WAV files needs a FAT upload tool; we add it when the recordings exist.
