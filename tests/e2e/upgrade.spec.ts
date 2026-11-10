import {
  openDeviceDetails,
  showWatch,
  showCaregiver,
  openPresenter,
  runDemoMoment,
} from "./watch-helpers";
import { openWatchHelp } from "./watch-helpers";
import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/#/together");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

const wearer = (page: import("@playwright/test").Page) =>
  page.locator(".wearer-interface");
const caregiver = (page: import("@playwright/test").Page) =>
  page.locator(".caregiver-interface");

test("home starts with a breathing mascot and two visible choices", async ({
  page,
}) => {
  const w = wearer(page);
  await expect(
    w.getByRole("button", { name: "Say hello to Sprout", exact: true }),
  ).toBeVisible();
  await expect(w.locator(".watch-picture-card:visible")).toHaveCount(2);
  await w
    .getByRole("button", { name: "Say hello to Sprout", exact: true })
    .click();
  await expect(w.locator(".watch-picture-card")).toHaveCount(2);
  await w
    .getByRole("button", { name: "Talk with Sprout", exact: true })
    .click();
  await expect(
    w.getByText("I’m here with you.", { exact: true }),
  ).toBeVisible();
  await w
    .getByRole("button", { name: "Back to main screen", exact: true })
    .click();
  await expect(
    w.getByRole("button", { name: "Say hello to Sprout", exact: true }),
  ).toBeVisible();
});

test("demo moments drive both devices and SOS disables unsafe moments", async ({
  page,
}) => {
  const bar = page.getByRole("toolbar", { name: "Demo moments" });
  await runDemoMoment(page, "Wanders off route");
  await expect(
    caregiver(page).getByText("Needs attention", { exact: true }),
  ).toBeVisible();
  await openDeviceDetails(page);
  await expect(caregiver(page).locator(".phone-findings")).toContainText(
    "Route deviation",
  );
  await expect(
    wearer(page).getByText("It's okay. I'm here with you.", { exact: true }),
  ).toBeVisible();

  await runDemoMoment(page, "Low battery");
  await expect(
    caregiver(page).getByText(/Battery is low \(12%\)/),
  ).toBeVisible();

  await runDemoMoment(page, "SOS");
  await expect(
    wearer(page).getByText("Help request sent — simulation", { exact: true }),
  ).toBeVisible();
  await openPresenter(page);
  await expect(
    bar.getByRole("button", { name: "Walk home", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Reset demo", exact: true }),
  ).toBeDisabled();
  await expect(
    caregiver(page).getByText("Urgent", { exact: true }),
  ).toBeVisible();
  await page.locator(".demo-more > summary").click();
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
  await openWatchHelp(page);
  await w.getByRole("button", { name: "Help me home", exact: true }).click();
  await expect(w.getByText("Stop 1 of 4")).toBeVisible();
  for (let i = 0; i < 4; i++)
    await w.getByRole("button", { name: "I see it", exact: true }).click();
  await expect(w.getByText("Welcome home.", { exact: true })).toBeVisible();
  await w
    .getByRole("button", { name: "Back to my watch", exact: true })
    .click();
  await expect(
    w.getByRole("button", { name: "Say hello to Sprout", exact: true }),
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
    w.getByRole("button", { name: "Sapa Sprout", exact: true }),
  ).toBeVisible();
  await expect(w.getByText("Halo, Alex.")).toBeVisible();
  await page.reload();
  await expect(
    w.getByRole("button", { name: "Sapa Sprout", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(
    w.getByRole("button", { name: "Say hello to Sprout", exact: true }),
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
  await openPresenter(page);
  await expect(
    page.getByRole("toolbar", { name: "Demo moments" }).getByRole("button", {
      name: "Takes it off",
    }),
  ).toBeVisible();
});

test("landing and guided story link to the live side-by-side stage", async ({
  page,
}) => {
  await page.goto("/#/");
  await page
    .getByRole("link", { name: /Explore demo/ })
    .first()
    .click();
  await expect(page).toHaveURL(/#\/together$/);
  await openPresenter(page);
  await expect(
    page.getByRole("toolbar", { name: "Demo moments" }),
  ).toBeVisible();
  await page.goto("/#/guided");
  await expect(page.locator(".guided-devices .care-phone")).toBeVisible();
  await page
    .getByRole("link", { name: "Open side-by-side stage", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/together$/);
});

test("dashboard banner turns amber with a direct action, demo page offers quick moments", async ({
  page,
}) => {
  await page.goto("/#/demo");
  await page
    .getByRole("toolbar", { name: "Demo moments" })
    .getByRole("button", { name: "Wanders off route" })
    .click();
  await page.goto("/#/caregiver");
  await expect(page.locator(".welcome-banner.tone-attention")).toBeVisible();
  await page.getByRole("link", { name: /Review alerts/ }).click();
  await expect(page).toHaveURL(/#\/caregiver\/alerts$/);
});
