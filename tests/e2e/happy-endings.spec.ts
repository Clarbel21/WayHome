import { test, expect, type Page } from "@playwright/test";

// Step 7 — the two happy endings must be visible on both devices, and the
// caregiver phone must still clear the bottom nav at the presenter sizes.

test.beforeEach(async ({ page }) => {
  await page.goto("/#/together");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

const watch = (page: Page) => page.locator(".watch-area").first();
const phone = (page: Page) =>
  page.getByRole("region", { name: "A little closer.", exact: true });
const moments = (page: Page) =>
  page.getByRole("toolbar", { name: "Demo moments" });

async function expectClearNav(page: Page, label: string) {
  const today = await phone(page).locator(".cph-today").boundingBox();
  const nav = await phone(page).locator(".cph-nav").boundingBox();
  expect(today, `${label}: Today must be laid out`).not.toBeNull();
  expect(nav, `${label}: phone nav must be visible`).not.toBeNull();
  const gap = nav!.y - (today!.y + today!.height);
  expect(
    gap,
    `${label}: need at least 8px above the nav, measured ${gap.toFixed(1)}px`,
  ).toBeGreaterThanOrEqual(7.5);
}

test("Arrives home ends the guided walk on both screens", async ({ page }) => {
  for (const size of [
    { width: 1440, height: 900 },
    { width: 1280, height: 720 },
  ]) {
    await page.setViewportSize(size);
    await page.reload();
    await moments(page)
      .getByRole("button", { name: "Arrives home", exact: true })
      .click();
    await expect(
      watch(page).getByText("Welcome home.", { exact: true }),
    ).toBeVisible();
    await expect(
      phone(page).getByText("All calm", { exact: true }),
    ).toBeVisible();
    await expect(
      phone(page).getByRole("heading", {
        name: "No active alerts",
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      phone(page).getByText(
        "Demo walk done · Alex is home.",
        { exact: true },
      ),
    ).toBeVisible();
    await expectClearNav(page, `arrived ${size.width}x${size.height}`);
  }
});

test("Family calls back closes the request on both screens", async ({
  page,
}) => {
  for (const size of [
    { width: 1440, height: 900 },
    { width: 1280, height: 720 },
  ]) {
    await page.setViewportSize(size);
    await page.reload();
    await moments(page)
      .getByRole("button", { name: "Family calls back", exact: true })
      .click();
    await expect(
      watch(page).getByText("Jamie Chen replied.", { exact: true }),
    ).toBeVisible();
    await expect(
      phone(page).getByRole("heading", { name: "Request done", exact: true }),
    ).toBeVisible();
    await expect(
      phone(page).getByText("Request done · Jamie Chen replied.", {
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      phone(page).getByText("All calm", { exact: true }),
    ).toBeVisible();
    await expect(
      phone(page).getByRole("button", {
        name: "Send a check-in",
        exact: true,
      }),
    ).toBeEnabled();
    await expectClearNav(page, `replied ${size.width}x${size.height}`);
  }
});
