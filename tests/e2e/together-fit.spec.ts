import { test, expect } from "@playwright/test";

// TEAM_PLAN v2 fit lock: #/together must fit with no page scroll at the
// presenter viewports, with the pairing pill and moments chips in frame.
const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 880, height: 700 },
];

test.beforeEach(async ({ page }) => {
  await page.goto("/#/companion");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(
    page.getByRole("region", { name: "A familiar friend." }),
  ).toBeVisible();
});

for (const { width, height } of VIEWPORTS) {
  test(`together fits ${width}x${height} with no page scroll`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await expect(page.locator("html")).toBeVisible();

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight,
    );
    expect(
      overflow,
      `page must not scroll at ${width}x${height}`,
    ).toBeLessThanOrEqual(2);

    // ESP32 pairing stays reachable (the whole point of the demo stage).
    await expect(
      page.getByRole("button", { name: "Connect Sprout watch" }),
    ).toBeVisible();

    // Presenter moments chips row stays in frame.
    await expect(
      page.getByRole("toolbar", { name: "Demo moments" }),
    ).toBeVisible();
    const chips = page.locator(".demo-stage-chips");
    await expect(chips).toBeVisible();
    const chipsBox = await chips.boundingBox();
    expect(chipsBox?.y ?? NaN).toBeLessThan(height);

    // Both devices render inside the viewport.
    await expect(page.locator(".care-phone")).toBeVisible();
    const phone = await page.locator(".care-phone").boundingBox();
    expect(phone?.y ?? NaN).toBeGreaterThan(0);
    expect((phone?.y ?? 0) + (phone?.height ?? 0)).toBeLessThanOrEqual(
      height + 2,
    ); // sub-pixel

    await expect(page.locator(".watch-area .watch")).toBeVisible();
    const watch = await page.locator(".watch-area .watch").boundingBox();
    expect((watch?.y ?? 0) + (watch?.height ?? 0)).toBeLessThanOrEqual(
      height + 2,
    ); // sub-pixel
  });
}

test("emoji home keeps the four tiles and SOS in the watch frame", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  const watch = page.locator(".watch-area .watch");
  const frame = await watch.boundingBox();
  for (const name of ["Help me home", "Call family", "Let's talk", "Game"]) {
    const tile = watch.getByRole("button", { name, exact: true });
    await expect(tile).toBeVisible();
    const box = await tile.boundingBox();
    expect(box?.y ?? NaN).toBeGreaterThanOrEqual(frame?.y ?? 0);
    expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(
      (frame?.y ?? 0) + (frame?.height ?? 0),
    );
  }
  const sos = watch.locator(".sos-hold");
  await expect(sos).toBeVisible();
  const sosBox = await sos.boundingBox();
  expect((sosBox?.y ?? 0) + (sosBox?.height ?? 0)).toBeLessThanOrEqual(
    (frame?.y ?? 0) + (frame?.height ?? 0),
  );
  // One-frame rule: the watch body itself never scrolls.
  const bodyOverflow = await page.evaluate(() => {
    const body = document.querySelector(".wos-body");
    return body ? body.scrollHeight - body.clientHeight : 0;
  });
  expect(bodyOverflow).toBeLessThanOrEqual(2);
});
