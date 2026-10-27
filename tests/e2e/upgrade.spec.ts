import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/#/together");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

const wearer = (page: import("@playwright/test").Page) =>
  page.getByRole("region", { name: "A familiar friend.", exact: true });
const caregiver = (page: import("@playwright/test").Page) =>
  page.getByRole("region", { name: "A little closer.", exact: true });

test("home screen offers four large actions plus SOS", async ({ page }) => {
  const w = wearer(page);
  for (const name of ["Go home", "Call family", "Talk"])
    await expect(w.getByRole("button", { name, exact: true })).toBeVisible();
  await expect(
    w.getByRole("link", { name: "Memories", exact: true }),
  ).toBeVisible();
  await expect(
    w.getByRole("button", { name: "SOS Hold for 2 seconds", exact: true }),
  ).toBeVisible();
  await w.getByRole("button", { name: "Talk", exact: true }).click();
  await w
    .getByRole("button", { name: "Who is my family?", exact: true })
    .click();
  await expect(
    w.getByText("Jamie Chen cares about you and is one tap away."),
  ).toBeVisible();
});

test("demo moments drive both devices and SOS disables unsafe moments", async ({
  page,
}) => {
  const bar = page.getByRole("toolbar", { name: "Demo moments" });
  await bar.getByRole("button", { name: "Wanders off route" }).click();
  await expect(
    caregiver(page).getByText("Needs attention", { exact: true }),
  ).toBeVisible();
  await expect(caregiver(page).getByText("Route deviation")).toBeVisible();
  await expect(
    wearer(page).getByText("It's okay. I'm here with you.", { exact: true }),
  ).toBeVisible();

  await bar.getByRole("button", { name: "Low battery" }).click();
  await expect(
    caregiver(page).getByText(/Battery is low \(12%\)/),
  ).toBeVisible();

  await bar.getByRole("button", { name: "SOS", exact: true }).click();
  await expect(
    wearer(page).getByText("Help request sent — simulation", { exact: true }),
  ).toBeVisible();
  await expect(bar.getByRole("button", { name: "Walk home" })).toBeDisabled();
  await expect(bar.getByRole("button", { name: "Reset demo" })).toBeDisabled();
  await expect(
    caregiver(page).getByText("Urgent", { exact: true }),
  ).toBeVisible();
  await caregiver(page)
    .getByRole("button", { name: "Acknowledge SOS alert", exact: true })
    .click();
  await expect(
    wearer(page).getByText("Jamie Chen has seen your SOS"),
  ).toBeVisible();
});

test("guided walk shows stop progress and ends on a welcome-home screen", async ({
  page,
}) => {
  const w = wearer(page);
  await w.getByRole("button", { name: "Go home", exact: true }).click();
  await expect(w.getByText("Stop 1 of 4")).toBeVisible();
  for (let i = 0; i < 4; i++)
    await w.getByRole("button", { name: "I see it", exact: true }).click();
  await expect(w.getByText("Welcome home.", { exact: true })).toBeVisible();
  await w
    .getByRole("button", { name: "Back to wearable home", exact: true })
    .click();
  await expect(
    w.getByRole("button", { name: "Go home", exact: true }),
  ).toBeVisible();
});

test("language switch renders Indonesian and persists, English restores names", async ({
  page,
}) => {
  await page.getByRole("button", { name: "ID", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "id");
  // Region names are translated too, so locate the watch structurally here.
  const w = page.locator(".watch-area").first();
  await expect(
    w.getByRole("button", { name: "Pulang", exact: true }),
  ).toBeVisible();
  await expect(
    w.getByText("Hai! Aku Sprout. Aku di sini bersamamu."),
  ).toBeVisible();
  await page.reload();
  await expect(
    w.getByRole("button", { name: "Pulang", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(
    w.getByRole("button", { name: "Go home", exact: true }),
  ).toBeVisible();
});

test("mobile stacks devices and wraps demo moments without horizontal scroll", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(
    page.getByRole("toolbar", { name: "Demo moments" }).getByRole("button", {
      name: "Takes it off",
    }),
  ).toBeVisible();
});
