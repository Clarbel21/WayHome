import { test, expect } from "@playwright/test";

for (const width of [1440, 390, 320]) {
  test(`critical watch actions fit and SOS has a separate usable target at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/#/together");
    const watch = page.locator(".watch");
    const original = (await watch.boundingBox())!;
    const body = page.locator(".wos-body");
    const sos = page.locator(".sos-hold");
    for (const scenario of ["home", "question", "guidance", "urgent"]) {
      if (scenario !== "home")
        await page.evaluate(async (scenario) => {
          const url = "/src/store.ts";
          const { useStore } = await import(url);
          useStore
            .getState()
            .event(
              scenario === "question"
                ? "CHECK"
                : scenario === "guidance"
                  ? "GUIDE"
                  : "SOS",
            );
        }, scenario);
      await expect(
        page.locator(`[data-watch-template=${scenario}]`),
      ).toBeVisible();
      await watch.scrollIntoViewIfNeeded();
      const frame = (await watch.boundingBox())!;
      expect(frame.width).toBe(original.width);
      expect(frame.height).toBe(original.height);
      const target = (await sos.boundingBox())!;
      expect(target.width).toBeGreaterThanOrEqual(44);
      expect(target.height).toBeGreaterThanOrEqual(44);
      expect(target.x).toBeGreaterThanOrEqual(frame.x + frame.width - 1);
      expect(target.x + target.width).toBeLessThanOrEqual(width);
      expect(target.x).toBeGreaterThanOrEqual(0);
      if (scenario !== "guidance")
        expect(
          await body.evaluate((el) => el.scrollHeight - el.clientHeight),
        ).toBeLessThanOrEqual(2);
      const content = (await body.boundingBox())!;
      for (const button of await body.getByRole("button").all()) {
        const box = (await button.boundingBox())!;
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.y).toBeGreaterThanOrEqual(content.y - 1);
        expect(box.y + box.height).toBeLessThanOrEqual(
          content.y + content.height + 1,
        );
      }
    }
    await sos.focus();
    await expect(sos).toBeFocused();
    expect(await sos.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe(
      "solid",
    );
  });
}

test("new watch controls meet text contrast and Indonesian check-in keeps its actions visible", async ({
  page,
}) => {
  await page.goto("/#/together");
  const ratios = await page
    .locator(".watch-picture-card")
    .evaluateAll((elements) => {
      function luminance(rgb: string) {
        const channels = rgb
          .match(/[\d.]+/g)!
          .slice(0, 3)
          .map(Number)
          .map((x) => x / 255)
          .map((x) =>
            x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4,
          );
        return (
          channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
        );
      }
      return elements.map((el) => {
        const style = getComputedStyle(el),
          a = luminance(style.color),
          b = luminance(style.backgroundColor);
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      });
    });
  for (const ratio of ratios) expect(ratio).toBeGreaterThanOrEqual(4.5);
  await page.getByRole("button", { name: "ID", exact: true }).click();
  await page.evaluate(async () => {
    const url = "/src/store.ts";
    const { useStore } = await import(url);
    useStore.getState().event("CHECK");
  });
  await expect(page.locator("[data-watch-template=question]")).toBeVisible();
  expect(
    await page
      .locator(".wos-body")
      .evaluate((el) => el.scrollHeight - el.clientHeight),
  ).toBeLessThanOrEqual(2);
});
