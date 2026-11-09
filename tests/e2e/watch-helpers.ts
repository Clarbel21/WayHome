import { expect, type Page } from "@playwright/test";

export async function wakeWatch(page: Page) {
  const watch = page.locator(".watch").first();
  await expect(watch).toBeVisible();
  const hello = watch.getByRole("button", { name: /^Say hello to / });
  if (await hello.isVisible()) {
    await hello.click();
    await expect(watch.locator(".watch-welcome-welcome")).toBeVisible();
  }
}

export async function openWatchHelp(page: Page) {
  const watch = page.locator(".watch").first();
  await expect(watch).toBeVisible();
  if (await watch.locator(".watch-help-home").isVisible()) return;
  await wakeWatch(page);
  await watch
    .locator(".watch-welcome")
    .getByRole("button", { name: "I'd like some help", exact: true })
    .click();
  await expect(watch.locator(".watch-help-home")).toBeVisible();
}

export async function openWatchMemories(page: Page) {
  await wakeWatch(page);
  await page
    .locator(".watch")
    .first()
    .getByRole("button", { name: "My memories", exact: true })
    .click();
}

export async function selectWatchActivity(page: Page, name: string) {
  const surface = (await page.locator(".wos-memories").isVisible())
    ? page.locator(".wos-memories")
    : page;
  const target = surface.getByRole("button", { name, exact: true });
  for (let step = 0; step < 4; step++) {
    if (await target.isVisible()) {
      await target.click();
      return;
    }
    await surface
      .getByRole("button", { name: /^(More activities|Back)$/ })
      .click();
    await page.evaluate(() => new Promise(requestAnimationFrame));
  }
  await target.click();
}

export async function expectGardenKeepsakes(page: Page, count: number) {
  // The compact watch omits decorative garden art; growth still persists.
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("wayhome-memory-v1")!).state.growth
            .length,
      ),
    )
    .toBe(count);
}
