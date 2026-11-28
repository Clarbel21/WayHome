import { test, expect, type Page } from "@playwright/test";

// Watch-home visual acceptance (branch zcode/watch-elderly-ui). The stage
// viewports themselves are locked by together-fit.spec.ts; this spec locks
// the watch screen content: the balanced 2x2 emoji home, one separate
// full-width SOS bar, comfortably tappable targets, keyboard focus, and
// no clipped (scrollable) content on any destination screen. A quick tap
// on the SOS bar must never send the alert — only the 3-second hold does.

const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 880, height: 700 },
];

const TILES = ["Help me home", "Call family", "Let's talk", "Game"] as const;

const watchOf = (page: Page) => page.locator(".watch-area .watch").first();

async function openFresh(page: Page, hash = "#/companion") {
  await page.goto(`/${hash}`);
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await watchOf(page).waitFor();
  await page.waitForTimeout(300);
}

/** The watch body and screen must never clip content (one-frame rule). */
async function expectWatchFits(page: Page) {
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

test("home is a balanced 2x2 grid with one full-width SOS bar at the bottom", async ({
  page,
}) => {
  await openFresh(page);
  const watch = watchOf(page);
  const frame = (await watch.boundingBox())!;

  const boxes = [];
  for (const name of TILES) {
    const tile = watch.getByRole("button", { name, exact: true });
    await expect(tile).toBeVisible();
    boxes.push((await tile.boundingBox())!);
  }

  // Four equal buttons (sub-pixel tolerance on the shared grid).
  for (const box of boxes) {
    expect(Math.abs(box.width - boxes[0].width)).toBeLessThanOrEqual(2);
    expect(Math.abs(box.height - boxes[0].height)).toBeLessThanOrEqual(2);
  }
  // Two rows of two: tiles 0+1 share a row, tiles 2+3 share the other.
  const rowY = (i: number) => Math.round(boxes[i].y / 4);
  expect(rowY(0)).toBe(rowY(1));
  expect(rowY(2)).toBe(rowY(3));
  expect(rowY(0)).not.toBe(rowY(2));
  // Comfortably tappable tiles with a large emoji and a readable label.
  expect(boxes[0].height).toBeGreaterThanOrEqual(60);
  const symbol = watch.locator(".wos-emoji-symbol").first();
  await expect(symbol).toBeVisible();
  expect((await symbol.boundingBox())!.height).toBeGreaterThanOrEqual(24);

  // One separate full-width SOS bar, the bottom-most control on the watch.
  const sos = watch.locator(".sos-hold");
  await expect(sos).toBeVisible();
  const sosBox = (await sos.boundingBox())!;
  const screenBox = (await page.locator(".watch-screen.wos").boundingBox())!;
  expect(sosBox.width).toBeGreaterThanOrEqual(screenBox.width - 30);
  expect(sosBox.y + sosBox.height).toBeLessThanOrEqual(
    frame.y + frame.height + 1,
  );
  const buttonBottoms = await page.evaluate(() =>
    [...document.querySelectorAll(".watch-screen.wos button")].map(
      (b) => b.getBoundingClientRect().bottom,
    ),
  );
  expect(sosBox.y + sosBox.height).toBeGreaterThanOrEqual(
    Math.max(...buttonBottoms) - 2,
  );

  // Keyboard focus lands on a tile with the shared visible outline.
  await expectWatchFits(page);
  let focus = "";
  for (let i = 0; i < 25 && !focus; i++) {
    await page.keyboard.press("Tab");
    focus = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return el && el.closest(".watch-screen.wos")
        ? getComputedStyle(el).outlineStyle
        : "";
    });
  }
  expect(focus).toBe("solid");
});

for (const viewport of VIEWPORTS) {
  test(`watch destinations fit ${viewport.width}x${viewport.height} and each returns home`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await openFresh(page);
    const watch = watchOf(page);

    // Talk: fits, and the way back restores the four-tile home.
    await watch
      .getByRole("button", { name: "Let's talk", exact: true })
      .click();
    await expect(watch.getByText("Hi! Want to chat with me?")).toBeVisible();
    await expectWatchFits(page);
    await watch.getByRole("button", { name: "Back", exact: true }).click();
    await expect(
      watch.getByRole("button", { name: "Help me home", exact: true }),
    ).toBeVisible();

    // Game (Familiar landmarks): picker + quiz fit, Back to home restores home.
    await watch.getByRole("button", { name: "Game", exact: true }).click();
    await expect(page.locator(".wos-game-pick")).toBeVisible();
    await expectWatchFits(page);
    await watch.getByRole("button", { name: "Places", exact: true }).click();
    await expect(page.locator(".wos-game-question")).toBeVisible();
    await expectWatchFits(page);
    await watch
      .getByRole("button", { name: "Back to home", exact: true })
      .click();
    await expect(
      watch.getByRole("button", { name: "Help me home", exact: true }),
    ).toBeVisible();

    // Call (family handover): fits, and the exit restores home.
    await watch
      .getByRole("button", { name: "Call family", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Back", exact: true }),
    ).toBeVisible();
    await expectWatchFits(page);
    await page.getByRole("button", { name: "Back", exact: true }).click();
    await expect(
      watch.getByRole("button", { name: "Help me home", exact: true }),
    ).toBeVisible();

    // Guided return: fits, and stopping the guidance restores home.
    await watch
      .getByRole("button", { name: "Help me home", exact: true })
      .click();
    await expect(
      watch.getByRole("button", { name: "I see it", exact: true }),
    ).toBeVisible();
    await expectWatchFits(page);
    await watch
      .getByRole("button", { name: "I know my way", exact: true })
      .click();
    await expect(
      watch.getByRole("button", { name: "Help me home", exact: true }),
    ).toBeVisible();
  });
}

for (const viewport of [
  { width: 1280, height: 720 },
  { width: 880, height: 700 },
]) {
  test(`safe-zone walk fits ${viewport.width}x${viewport.height} while walking, with notes and during a paused check-in`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    await openFresh(page);
    const watch = watchOf(page);
    const moments = page.getByRole("toolbar", { name: "Demo moments" });

    // The walk: direction block and status notes share the screen.
    await moments
      .getByRole("button", { name: "Walk out of safe zone" })
      .click();
    await page.waitForTimeout(400);
    await watch.getByRole("button", { name: "Yes, go home" }).click();
    await expect(
      watch.getByText(/Go straight|Turn left|Turn right|Do you see/).first(),
    ).toBeVisible();
    await expectWatchFits(page);

    // Weak GPS pauses guidance and opens a feeling check-in while the
    // note is still on screen: the two answers must still fit.
    await moments.getByRole("button", { name: "Weak GPS" }).click();
    await expect(
      watch.getByText("How are you feeling?", { exact: true }),
    ).toBeVisible();
    await expectWatchFits(page);
    await expect(
      watch.getByRole("button", { name: "I'm okay", exact: true }),
    ).toBeVisible();
  });
}

test("a quick SOS tap sends nothing; the 3-second hold still does", async ({
  page,
}) => {
  await openFresh(page);
  const sos = page.locator(".sos-hold").first();
  const box = (await sos.boundingBox())!;
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const alert = page.getByText("Help is coming. · Demo", {
    exact: true,
  });

  // A normal click (press + release well under 3 s) must stay silent.
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.waitForTimeout(500);
  await page.mouse.up();
  await page.waitForTimeout(600);
  await expect(alert).toHaveCount(0);

  // Holding for 3 seconds still sends the established alert; the safety
  // screen that takes over also fits the watch without clipping.
  await page.mouse.down();
  await page.waitForTimeout(3300);
  await page.mouse.up();
  await expect(alert).toBeVisible();
  await expectWatchFits(page);
});

test("the watch stays physically smaller than the caregiver phone", async ({
  page,
}) => {
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport);
    await openFresh(page);
    const watch = await watchOf(page).boundingBox();
    const phone = await page.locator(".care-phone").first().boundingBox();
    expect(watch).not.toBeNull();
    expect(phone).not.toBeNull();
    expect(
      watch!.height,
      `watch must be shorter than the phone at ${viewport.width}x${viewport.height}`,
    ).toBeLessThan(phone!.height);
  }
});
