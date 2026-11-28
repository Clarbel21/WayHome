import type { Page } from "@playwright/test";

// A fake browser SpeechRecognition so tests can "say" something to Momo.
// Call before page.goto(); then sayToMomo(page, "Comfort me").
export async function installFakeSpeech(page: Page) {
  await page.addInitScript(() => {
    class FakeRec {
      lang = "en-US";
      interimResults = false;
      maxAlternatives = 1;
      onresult: ((e: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      start() {
        (window as any).__momoRec = this;
      }
      stop() {
        this.onend?.();
      }
    }
    (window as any).SpeechRecognition = FakeRec;
  });
}

export async function sayToMomo(page: Page, text: string) {
  await page.waitForFunction(() => !!(window as any).__momoRec);
  await page.evaluate((said) => {
    const rec = (window as any).__momoRec;
    rec.onresult?.({ results: [[{ transcript: said }]] });
  }, text);
}
