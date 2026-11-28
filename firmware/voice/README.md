# Momo's voice on the physical watch (TEAM_PLAN V1)

The ESP32 plays short WAV clips from the **micro-SD card**:

```
SD card
└── wayhome/
    ├── voice/   hello.wav, talk-ask-guide.wav, guide-0.wav … (one per line in lines.tsv)
    └── calls/   jamie.wav, sam.wav, mei.wav   (placeholders until the family records them)
```

Format: 16 kHz, 16-bit, mono PCM WAV with a plain 44-byte header.
No card or a missing file = the watch stays silent (Serial Monitor shows `[AUDIO] … missing`).

## Make the clips

```
pip install piper-tts
curl -LO https://github.com/rhasspy/piper/releases/download/v0.0.2/voice-en-us-amy-low.tar.gz
tar xzf voice-en-us-amy-low.tar.gz
firmware/voice/make_voice.sh en-us-amy-low.onnx out/
```

Copy `out/wayhome` to the root of the SD card. To change a line, edit `lines.tsv`
(name ⇥ text) and run the script again. Real family messages: record them as
16 kHz mono WAV and replace `calls/jamie.wav` etc.

## When Momo speaks

| Screen | Clip |
|---|---|
| Talk opens | talk-ask-guide (outside the safe zone) / talk-ask-chat |
| Talk answers | go-home, talk-chat-start, talk-bye; quiet → talk-still-there |
| Guide home, each stop | guide-0 … guide-3 |
| Not yet | not-yet |
| Call | who-to-call, calling-jamie/sam/mei (then the ring), no-answer; answered → calls/<name> |
| SOS | sos |
| Check-in | checkin, thanks |
| Watch taken off | put-me-on |
| Game | which-game, game-right, game-gentle, well-done |
