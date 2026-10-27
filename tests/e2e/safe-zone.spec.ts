import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/#/together");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

const watch = (page: import("@playwright/test").Page) =>
  page.locator(".watch-area").first();
const phone = (page: import("@playwright/test").Page) =>
  page.getByRole("region", { name: "A little closer.", exact: true });
const moments = (page: import("@playwright/test").Page) =>
  page.getByRole("toolbar", { name: "Demo moments" });

test("leaving the safe zone buzzes the watch, escalates, then guides home landmark by landmark", async ({
  page,
}) => {
  await phone(page)
    .getByLabel(/Safe radius/)
    .fill("500");
  await expect(phone(page).getByText("500 m", { exact: true })).toBeVisible();

  await moments(page)
    .getByRole("button", { name: "Walk out of safe zone" })
    .click();
  await expect(watch(page).getByText("Heading home?")).toBeVisible({
    timeout: 10_000,
  });
  await expect(watch(page)).toHaveClass(/buzz|zone-alert/);
  await expect(
    phone(page).getByRole("heading", { name: "Outside the safe zone" }),
  ).toBeVisible();

  await moments(page).getByRole("button", { name: "+8 min" }).click();
  await expect(
    phone(page).locator(".zone-ladder li.done", { hasText: "Notify Jamie" }),
  ).toBeVisible();

  await watch(page).getByRole("button", { name: "No, I'm fine" }).click();
  await expect(watch(page).getByText("Heading home?")).toHaveCount(0);

  // The wearer can still choose to go home from the home screen.
  await watch(page)
    .getByRole("button", { name: "Go home", exact: true })
    .click();
  await expect(watch(page).getByText("Go straight ahead")).toBeVisible();
  await expect(
    phone(page).getByRole("img", { name: /Route home map/ }),
  ).toBeVisible();
  await expect(phone(page).getByText(/escalation paused/)).toBeVisible();

  for (const name of [
    "Community garden",
    "Neighborhood bakery",
    "Local library",
    "Home",
  ]) {
    await expect(watch(page).getByText(`Do you see the ${name}?`)).toBeVisible({
      timeout: 15_000,
    });
    await watch(page)
      .getByRole("button", { name: "I see it", exact: true })
      .click();
    if (name === "Community garden")
      await expect(
        watch(page).getByText("Turn right at the Community garden"),
      ).toBeVisible();
  }
  await expect(
    watch(page).getByText("Welcome home.", { exact: true }),
  ).toBeVisible();
  await expect(
    phone(page).getByRole("heading", { name: "No active alerts", exact: true }),
  ).toBeVisible({ timeout: 5_000 });
  const titles = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("wayhome-v1")!).state.alerts.map(
        (a: { title: string }) => a.title,
      ) as string[],
  );
  expect(titles.some((t) => /arrived home safely/.test(t))).toBe(true);
  expect(titles.some((t) => /left the safe zone/.test(t))).toBe(true);
});

test("staying outside long enough reaches the simulated emergency step", async ({
  page,
}) => {
  await moments(page)
    .getByRole("button", { name: "Lost far from home" })
    .click();
  await expect(watch(page).getByText("Heading home?")).toBeVisible({
    timeout: 5_000,
  });
  for (let i = 0; i < 3; i++)
    await moments(page).getByRole("button", { name: "+8 min" }).click();
  await expect(
    watch(page).getByText("Help request sent — simulation", { exact: true }),
  ).toBeVisible({ timeout: 5_000 });
  await expect(phone(page).getByText("Urgent", { exact: true })).toBeVisible();
});

test("radius setting persists and lives on the safety policy page", async ({
  page,
}) => {
  await page.goto("/#/caregiver/policy");
  await expect(
    page.getByRole("heading", { name: "Safe zone around home" }),
  ).toBeVisible();
  await page.getByLabel(/Safe radius/).fill("800");
  await page.reload();
  await expect(page.getByText("800 m", { exact: true })).toBeVisible();
});
