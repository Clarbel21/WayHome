import { openPresenter } from "./watch-helpers";
import { openWatchHelp } from "./watch-helpers";
import { test, expect, type Page } from "@playwright/test";

async function openDemo(page: Page) {
  await page.goto("/#/together");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await expect(page.locator(".watch-screen")).toBeVisible();
}

test("watch case stays fixed through every screen, long content, language and large text", async ({
  page,
}) => {
  for (const viewport of [
    { width: 1440, height: 1000 },
    { width: 390, height: 844 },
    { width: 320, height: 700 },
  ]) {
    await page.setViewportSize(viewport);
    await openDemo(page);
    const watch = page.locator(".watch");
    const original = (await watch.boundingBox())!;
    const sameCase = async () => {
      const box = (await watch.boundingBox())!;
      expect(box.width).toBeCloseTo(original.width, 0);
      expect(box.height).toBeCloseTo(original.height, 0);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth),
      ).toBeLessThanOrEqual(viewport.width);
      const sos = page.locator(".watch .sos-hold");
      const before = await sos.evaluate(
        (el) =>
          el.getBoundingClientRect().y -
          el.closest(".watch")!.getBoundingClientRect().y,
      );
      await page.locator(".wos-body").evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      expect(
        await sos.evaluate(
          (el) =>
            el.getBoundingClientRect().y -
            el.closest(".watch")!.getBoundingClientRect().y,
        ),
      ).toBeCloseTo(before, 0);
      expect(
        await sos.evaluate((el) => {
          const button = el.getBoundingClientRect();
          const frame = el.closest(".watch")!.getBoundingClientRect();
          return button.bottom <= frame.bottom && button.top >= frame.top;
        }),
      ).toBe(true);
    };
    await sameCase();
    await page.getByRole("button", { name: "ID", exact: true }).click();
    await sameCase();
    await page.getByRole("button", { name: "EN", exact: true }).click();
    await page.evaluate(async () => {
      const url = "/src/components/watchUi.ts";
      (await import(url)).useWatchUi.getState().openMemories();
    });
    await expect(page.locator(".watch-area")).toHaveAttribute(
      "data-watch-screen",
      "memories",
    );
    await sameCase();
    for (const mode of ["focus", "dialogue", "normal"]) {
      await page.evaluate(async (value) => {
        const uiUrl = "/src/components/watchUi.ts";
        (await import(uiUrl)).useWatchUi.getState().closeMemories();
        const storeUrl = "/src/store.ts";
        const state = (await import(storeUrl)).useStore.getState();
        state.setExperienceMode(value, "caregiver");
        state.settingsUpdate({ largeText: true });
      }, mode);
      await sameCase();
    }
    for (const event of [
      "CHECK",
      "GUIDE",
      "LOST",
      "HELP",
      "DISCONNECT",
      "REMOVE",
      "SOS",
    ]) {
      await page.evaluate(async (value) => {
        const url = "/src/store.ts";
        const state = (await import(url)).useStore.getState();
        state.reset();
        state.event(value);
      }, event);
      await page.evaluate(() => new Promise(requestAnimationFrame));
      await sameCase();
    }
    await watch.screenshot({
      path: test.info().outputPath("watch-" + viewport.width + ".png"),
      animations: "disabled",
    });
  }
});

test("clear primary controls complete check-in, guidance and explicit SOS resolution", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openDemo(page);
  const phone = page.locator(".care-phone");
  const watch = page.locator(".watch");
  const start = (await watch.boundingBox())!;
  await phone
    .getByRole("button", { name: "Send a check-in", exact: true })
    .click();
  await watch.getByRole("button", { name: "I'm okay", exact: true }).click();
  await expect(
    phone.getByRole("heading", { name: "No active alerts", exact: true }),
  ).toBeVisible();
  await watch
    .getByRole("button", { name: "Back to main screen", exact: true })
    .click();
  await openWatchHelp(page);
  await watch
    .getByRole("button", { name: "Help me home", exact: true })
    .click();
  await expect(watch.getByText("Stop 1 of 4", { exact: true })).toBeVisible();
  await expect(
    watch.getByRole("group", { name: "Watch screen", exact: true }),
  ).toBeFocused();
  await expect(watch.locator(".wos-question")).toContainText("Do you see", {
    timeout: 15000,
  });
  const photo = watch.locator(".wos-photo");
  expect((await photo.boundingBox())!.height).toBeGreaterThanOrEqual(70);
  await watch.scrollIntoViewIfNeeded();
  await expect(
    watch.getByRole("button", { name: "I see it", exact: true }),
  ).toBeInViewport({ ratio: 1 });
  await expect(
    watch.getByRole("button", { name: "Not yet", exact: true }),
  ).toBeInViewport({ ratio: 1 });
  await expect(phone.locator(".phone-action-popup")).toHaveCount(1);
  await watch.screenshot({
    path: test.info().outputPath("guidance.png"),
    animations: "disabled",
  });
  for (let i = 0; i < 4; i++)
    await watch.getByRole("button", { name: "I see it", exact: true }).click();
  await expect(watch.getByText("Welcome home.", { exact: true })).toBeVisible();
  const sos = watch.getByRole("button", {
    name: "SOS Send help request",
    exact: true,
  });
  await sos.focus();
  await page.keyboard.press("Space");
  await expect(phone.locator(".phone-action-popup")).toHaveCount(1);
  await expect(phone.locator(".phone-action-popup")).toContainText(
    "SOS sent from the watch",
  );
  await phone
    .getByRole("button", { name: "Acknowledge SOS alert", exact: true })
    .click();
  await expect(page.locator(".watch-area")).toHaveAttribute(
    "data-watch-screen",
    "EMERGENCY_SIMULATED",
  );
  await openPresenter(page);
  await expect(
    page.getByRole("button", { name: "Reset demo", exact: true }),
  ).toBeDisabled();
  await watch
    .getByRole("button", { name: "Help received — resolve SOS", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Caregiver confirms — resolve SOS",
      exact: true,
    })
    .click();
  await expect(page.locator(".watch-area")).not.toHaveAttribute(
    "data-watch-screen",
    "EMERGENCY_SIMULATED",
  );
  const end = (await watch.boundingBox())!;
  expect(end.width).toBe(start.width);
  expect(end.height).toBe(start.height);
});

test("phone navigation and essential home actions remain visible without internal scrolling", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openDemo(page);
  const body = page.locator(".wos-body");
  expect(
    await body.evaluate((el) => el.scrollHeight <= el.clientHeight + 2),
  ).toBe(true);
  const phone = page.locator(".care-phone");
  const scroll = page.locator(".phone-scroll");
  const nav = phone.getByRole("navigation", { name: "Phone views" });
  const before = (await nav.boundingBox())!;
  await scroll.evaluate((el) => {
    el.scrollTop = el.scrollHeight;
  });
  expect((await nav.boundingBox())!.y).toBe(before.y);
  await nav.getByRole("button", { name: "Care tools", exact: true }).click();
  await expect(
    phone.getByRole("heading", { name: "Your care tools", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("desktop.png"),
    fullPage: true,
    animations: "disabled",
  });
});
