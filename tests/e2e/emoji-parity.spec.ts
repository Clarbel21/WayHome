import { test, expect } from "@playwright/test";

// Emoji-watch parity walkthrough (TEAM_PLAN v2 rule 5: facts stay factual),
// written against the classic shell's selectors. Three safety facts:
//   1. SOS overrides everything, including an open memory activity.
//   2. A caregiver acknowledgment is receipt only — it never resolves the SOS.
//   3. An open memory activity survives a reload; safety still interrupts it.

test.beforeEach(async ({ page }) => {
  await page.goto("/#/companion");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(page.locator(".watch-area .watch")).toBeVisible();
});

const holdSos = async (page: import("@playwright/test").Page) => {
  await page.locator(".sos-hold").click({ delay: 3300 });
};

test("SOS overrides an open memory activity on the watch", async ({ page }) => {
  const watch = page.locator(".watch-area .watch");
  await watch.getByRole("button", { name: "My memories", exact: true }).click();
  const garden = page.locator(".wos-memories");
  await expect(garden).toBeVisible();
  await garden.getByRole("button", { name: "Let's begin" }).click();

  await holdSos(page);
  await expect(page.getByText("Help request sent — simulation")).toBeVisible();
  // The safety event takes over the watch screen.
  await expect(page.locator(".wos-memories")).toHaveCount(0);
  await expect(
    page
      .getByRole("region", { name: "A familiar friend." })
      .getByText(/Help request sent|Stay where you are/)
      .first(),
  ).toBeVisible();
});

test("caregiver acknowledgment is receipt only; SOS needs explicit resolution", async ({
  page,
}) => {
  await holdSos(page);
  await expect(page.getByText("Help request sent — simulation")).toBeVisible();

  const phone = page.getByRole("region", { name: "A little closer." });
  await phone.getByRole("button", { name: "Acknowledge SOS alert" }).click();
  await expect(
    page
      .getByText(/acknowledgment recorded|Resolution still needs caregiver/i)
      .first(),
  ).toBeVisible();

  // The watch is still in the emergency flow — acknowledgment did not end it.
  await expect(page.getByText("Help request sent — simulation")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Help is here|resolve SOS/i }).first(),
  ).toBeVisible();
});

test("open memory activity survives a reload and still steps aside for safety", async ({
  page,
}) => {
  const watch = page.locator(".watch-area .watch");
  await watch.getByRole("button", { name: "My memories", exact: true }).click();
  const garden = page.locator(".wos-memories");
  await expect(garden).toBeVisible();
  await garden.getByRole("button", { name: "Let's begin" }).click();

  await page.reload();
  await expect(page.locator(".wos-memories")).toBeVisible();

  await holdSos(page);
  await expect(page.getByText("Help request sent — simulation")).toBeVisible();
  await expect(page.locator(".wos-memories")).toHaveCount(0);
});
