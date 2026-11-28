# Call recordings (Call lane C2)

When a call is answered, the web watch plays `call-<contact id>.mp3` from this folder:

| Contact | File |
|---|---|
| Jamie (daughter) | `call-jamie.mp3` |
| Sam (son) | `call-sam.mp3` |
| Mei (sister) | `call-mei.mp3` |

Keep each under ~15 s. No file = no sound; nothing else changes.
The ESP32 plays `call-0.wav`, `call-1.wav`, `call-2.wav` (same order) from its
flash — see `firmware/wayhome-watch/README.md`.
