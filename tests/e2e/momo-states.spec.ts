import { test, expect, type Page } from "@playwright/test";

// Momo's five SVGs are decorative: they replace no watch text and add no
// buttons. Talk follows the mic / her own voice, Game celebrates a correct
// answer, and SOS shows a concerned face.

const watch = (page: Page) => page.locator(".watch-area .watch").first();
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 880, height: 700 },
];

async function installMomoSpeech(page: Page) {
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
    class FakeUtterance {
      text: string;
      lang = "en-US";
      onend: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor(text: string) {
        this.text = text;
        (window as any).__momoUtterance = this;
      }
    }
    const synth = {
      speaking: false,
      cancel() {},
      speak(utterance: FakeUtterance) {
        (window as any).__momoUtterance = utterance;
      },
    };
    Object.defineProperty(window, "speechSynthesis", {
      configurable: true,
      value: synth,
    });
    Object.defineProperty(window, "SpeechSynthesisUtterance", {
      configurable: true,
      value: FakeUtterance,
    });
    (window as any).SpeechRecognition = FakeRec;
  });
}

async function openFresh(page: Page) {
  await page.goto("/#/companion");
  await page.evaluate(() => {
    localStorage.clear();
    // Voice on so the speaking face is actually in play.
    localStorage.setItem(
      "wayhome-v1",
      JSON.stringify({ state: { settings: { voice: true } }, version: 1 }),
    );
  });
  await page.reload();
  await watch(page).waitFor();
}

async function endSpeech(page: Page) {
  await page.evaluate(() => {
    const utterance = (window as any).__momoUtterance;
    if (typeof utterance?.onend === "function") utterance.onend();
  });
}

async function say(page: Page, text: string) {
  await page.waitForFunction(() => !!(window as any).__momoRec);
  await page.evaluate((said) => {
    (window as any).__momoRec.onresult?.({
      results: [[{ transcript: said }]],
    });
  }, text);
}

async function expectOneFrame(page: Page) {
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const h = (el: Element | null) =>
          el ? el.scrollHeight - el.clientHeight : 0;
        const w = (el: Element | null) =>
          el ? el.scrollWidth - el.clientWidth : 0;
        return Math.max(
          h(document.querySelector(".wos-body")),
          w(document.querySelector(".wos-body")),
          h(document.querySelector(".watch-screen.wos")),
          w(document.querySelector(".watch-screen.wos")),
        );
      }),
    )
    .toBeLessThanOrEqual(2);
}

test.beforeEach(async ({ page }) => {
  await installMomoSpeech(page);
  await openFresh(page);
});

test("Talk follows Momo's voice, then the mic, then rests", async ({
  page,
}) => {
  await watch(page)
    .getByRole("button", { name: "Let's talk", exact: true })
    .click();
  const momo = watch(page).locator(".wos-momo .momo");

  await expect(momo).toHaveClass(/momo-speaking/);
  await expect(momo).toHaveAttribute("src", /momo-speaking\.svg/);
  await expect
    .poll(() =>
      momo.evaluate((img) => (img as HTMLImageElement).naturalWidth),
    )
    .toBeGreaterThan(0);

  await endSpeech(page);
  await expect(momo).toHaveClass(/momo-listening/);
  await expect(momo).toHaveAttribute("src", /momo-listening\.svg/);

  await say(page, "Where am I?");
  await expect(momo).toHaveClass(/momo-speaking/);
  await endSpeech(page);
  await expect(momo).toHaveClass(/momo-listening/);

  await page.evaluate(() => (window as any).__momoRec.onend?.());
  await expect(momo).toHaveClass(/momo-idle/);
  await expect(momo).toHaveAttribute("src", /momo-idle\.svg/);

  // Same controls as before: two opening answers and Back, still no typing.
  await expect(watch(page).locator(".wos-talk button")).toHaveCount(3);
  await expect(watch(page).getByRole("textbox")).toHaveCount(0);
  await expectOneFrame(page);
});

test("Game shows happy Momo only after a correct answer", async ({ page }) => {
  await watch(page).getByRole("button", { name: "Game", exact: true }).click();
  await watch(page).getByRole("button", { name: "Places", exact: true }).click();
  const quiz = watch(page).locator(".wos-game");

  await quiz.getByRole("button", { name: /^garden$/i }).click();
  await expect(quiz).toHaveAttribute("data-result", "right");
  await expect(quiz.locator(".wos-game-momo")).toHaveClass(/momo-happy/);
  await expect(quiz.locator(".wos-game-momo")).toHaveAttribute(
    "src",
    /momo-happy\.svg/,
  );
  await expect(quiz.locator("button")).toHaveCount(2);
  await expectOneFrame(page);

  await quiz.getByRole("button", { name: "Next", exact: true }).click();
  await quiz.getByRole("button", { name: /^library$/i }).click();
  await expect(quiz).toHaveAttribute("data-result", "gentle");
  await expect(quiz.locator(".wos-game-momo")).toHaveCount(0);
  await expectOneFrame(page);
});

test("SOS shows concerned Momo without changing the calm line", async ({
  page,
}) => {
  const sos = page.locator(".sos-hold").first();
  const box = (await sos.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(3300);
  await page.mouse.up();

  const momo = watch(page).locator(".wos-sos .momo");
  await expect(momo).toHaveClass(/momo-concerned/);
  await expect(momo).toHaveAttribute("src", /momo-concerned\.svg/);
  await expect(
    watch(page).getByText("Help is coming. · Demo", { exact: true }),
  ).toBeVisible();
  await expectOneFrame(page);
});

test("all Momo screens fit at each stage size", async ({ page }) => {
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport);
    await openFresh(page);
    await watch(page)
      .getByRole("button", { name: "Let's talk", exact: true })
      .click();
    // The established compact layout hides the face behind the two opening
    // answers at 880px; larger stages keep it visible.
    if (viewport.width > 900)
      await expect(watch(page).locator(".wos-momo .momo")).toBeVisible();
    else await expect(watch(page).locator(".wos-momo .momo")).toBeHidden();
    await expectOneFrame(page);
    await watch(page).getByRole("button", { name: /Back/ }).click();

    await watch(page).getByRole("button", { name: "Game", exact: true }).click();
    await watch(page)
      .getByRole("button", { name: "Places", exact: true })
      .click();
    await watch(page)
      .locator(".wos-game")
      .getByRole("button", { name: /^garden$/i })
      .click();
    await expect(watch(page).locator(".wos-game-momo")).toBeVisible();
    await expectOneFrame(page);

    await watch(page).getByRole("button", { name: /Back/ }).click();
    const sos = page.locator(".sos-hold").first();
    const box = (await sos.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.waitForTimeout(3300);
    await page.mouse.up();
    await expect(watch(page).locator(".wos-sos .momo-concerned")).toBeVisible();
    await expectOneFrame(page);
  }
});
