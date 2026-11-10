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

export async function showWatch(page: Page) {
  const tab = page.getByRole("tab", { name: /^Watch/ });
  if (await tab.isVisible()) await tab.click();
}
export async function showCaregiver(page: Page) {
  const tab = page.getByRole("tab", { name: /^Caregiver/ });
  if (await tab.isVisible()) await tab.click();
}
export async function openPresenter(page: Page) {
  const more = page.locator(".demo-more");
  if ((await more.getAttribute("open")) === null)
    await more.locator(":scope > summary").click();
  const scenarios = page.locator(".demo-presenter");
  if ((await scenarios.getAttribute("open")) === null)
    await scenarios.locator(":scope > summary").click();
}
export async function openWatchHelp(page: Page) {
  await showWatch(page);
  const watch = page.locator(".watch").first();
  await expect(watch).toBeVisible();
  if (await watch.locator(".watch-help-home").isVisible()) return;
  const more = watch.getByRole("button", { name: "More choices", exact: true });
  if (!(await more.isVisible()))
    await watch
      .getByRole("button", { name: "Back to main screen", exact: true })
      .click();
  await more.click();
  await expect(watch.locator(".watch-help-home")).toBeVisible();
}
export async function openWatchMemories(page: Page) {
  await showWatch(page);
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

export async function openMore(page: Page) {
  const more = page.locator(".demo-more");
  if ((await more.getAttribute("open")) === null)
    await more.locator(":scope > summary").click();
}
export async function openMemoriesFromMenu(page: Page) {
  await openMore(page);
  await page
    .getByRole("button", { name: "Explore Memories", exact: true })
    .click();
}
export async function runDemoMoment(page: Page, name: string) {
  await openPresenter(page);
  await page
    .getByRole("toolbar", { name: "Demo moments" })
    .getByRole("button", { name, exact: true })
    .click();
}
export async function openDeviceDetails(page: Page) {
  const details = page.locator(".phone-overview-details");
  if ((await details.getAttribute("open")) === null)
    await details.locator("summary").click();
}
