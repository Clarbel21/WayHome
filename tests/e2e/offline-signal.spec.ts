import { test, expect, type Page } from "@playwright/test";

// "Loses signal" (TEAM_PLAN Step 3). An offline watch cannot receive the
// caregiver's check-in, so the watch shows a calm Offline screen with only
// local actions, the phone explains the watch is offline, and a requested
// check-in waits until the watch reconnects (Reset demo or reconnect).

const watch = (page: Page) => page.locator(".watch-area .watch").first();
const phone = (page: Page) => page.locator(".care-phone").first();
const saved = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem("wayhome-v1")!).state);

async function openFresh(page: Page) {
  await page.goto("/#/together");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(phone(page)).toBeVisible();
  await expect(watch(page)).toBeVisible();
}

const losesSignal = (page: Page) =>
  page
    .getByRole("toolbar", { name: "Demo moments" })
    .getByRole("button", { name: "Loses signal", exact: true })
    .click();

async function expectWatchFits(page: Page) {
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const el = document.querySelector(".wos-body");
        return el
          ? Math.max(
              el.scrollHeight - el.clientHeight,
              el.scrollWidth - el.clientWidth,
            )
          : 0;
      }),
    )
    .toBeLessThanOrEqual(2);
}

test("an offline watch shows a calm Offline screen and never a check-in", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openFresh(page);
  await losesSignal(page);

  const w = watch(page);
  await expect(w.locator(".wos-body")).toHaveAttribute("data-screen", "offline");
  await expect(
    w.getByText("No signal right now", { exact: true }),
  ).toBeVisible();
  // Home, Call and SOS still work locally.
  await expect(
    w.getByRole("button", { name: "Help me home", exact: true }),
  ).toBeVisible();
  await expect(
    w.getByRole("button", { name: "Call family", exact: true }),
  ).toBeVisible();
  await expect(w.locator(".sos-hold")).toBeVisible();
  // The caregiver's check-in cannot have reached an offline watch.
  await expect(
    w.getByText("How are you feeling?", { exact: true }),
  ).toHaveCount(0);
  await expectWatchFits(page);

  // Everything the wearer reads stays at or above the 15px legibility floor.
  for (const selector of [
    ".wos-offline .speech",
    ".wos-offline-actions .watch-action",
  ]) {
    const size = await w
      .locator(selector)
      .first()
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(size, `${selector} must be at least 15px`).toBeGreaterThanOrEqual(15);
  }
});

test("the phone says the watch is offline and a check-in will wait", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openFresh(page);
  await losesSignal(page);

  await expect(phone(page).locator(".cph-hero-sub")).toHaveText(
    "Watch offline · last seen near home",
  );
  const send = page.getByRole("button", {
    name: "Send a check-in",
    exact: true,
  });
  await expect(send).toBeEnabled();
  await send.click();
  await expect(
    page.getByText("Will wait until the watch reconnects.", { exact: true }),
  ).toBeVisible();

  // The request is held, not delivered: the watch holds no live check-in.
  const state = await saved(page);
  expect(state.connected).toBe(false);
  expect(state.checkIn).toBeNull();
  expect(state.queuedCheckIn).not.toBeNull();
});

test("Reset demo delivers the waiting check-in when the watch returns", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openFresh(page);
  await losesSignal(page);
  await page
    .getByRole("button", { name: "Send a check-in", exact: true })
    .click();
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();

  const w = watch(page);
  await expect(
    w.getByText("How are you feeling?", { exact: true }),
  ).toBeVisible();
  await expect(
    w.getByRole("button", { name: "I'm okay", exact: true }),
  ).toBeVisible();
  await expect(phone(page).locator(".cph-hero-sub")).toHaveText(
    "Waiting for Alex to answer…",
  );
});

test("Restore simulated connection delivers a queued check-in", async ({
  page,
}) => {
  await openFresh(page);
  await losesSignal(page);
  await page
    .getByRole("button", { name: "Send a check-in", exact: true })
    .click();
  expect((await saved(page)).queuedCheckIn).not.toBeNull();

  await page.goto("/#/caregiver/settings");
  await page
    .getByRole("button", { name: "Restore simulated connection" })
    .click();

  const state = await saved(page);
  expect(state.connected).toBe(true);
  expect(state.queuedCheckIn).toBeNull();
  expect(state.checkIn.stage).toBe("question");

  await page.goto("/#/companion");
  await expect(
    watch(page).getByText("How are you feeling?", { exact: true }),
  ).toBeVisible();
});
