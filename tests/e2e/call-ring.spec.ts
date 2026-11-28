import { test, expect, type Page } from "@playwright/test";

// Call lane C2: ringing → phone declines → "No answer" → Try next →
// phone answers → "<name> replied." Demo only: nothing is dialled.

const watch = (page: Page) => page.locator(".watch-area .watch").first();
const phone = (page: Page) => page.locator(".care-phone").first();

test("ring, no answer, try the next person, answered", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/#/together");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await watch(page).getByRole("button", { name: "Call family", exact: true }).click();
  await watch(page).getByRole("button", { name: "Call family: Sam" }).click();

  await expect(watch(page).getByText("Ringing…", { exact: true })).toBeVisible();
  const incoming = phone(page).getByRole("region", { name: "Incoming call" });
  await expect(incoming).toContainText("Alex is calling Sam");
  await page.waitForTimeout(700);
  await page.screenshot({ path: "docs/lane-call-c2/ringing.png" });

  await incoming.getByRole("button", { name: "Decline" }).click();
  await expect(watch(page).getByText("No answer · Demo", { exact: true })).toBeVisible();
  await page.waitForTimeout(700);
  await page.screenshot({ path: "docs/lane-call-c2/no-answer.png" });

  await watch(page).getByRole("button", { name: "Try Mei" }).click();
  await expect(incoming).toContainText("Alex is calling Mei");
  await incoming.getByRole("button", { name: "Answer" }).click();
  await expect(watch(page).getByText("Mei replied · Demo", { exact: true })).toBeVisible();
  await page.waitForTimeout(700);
  await page.screenshot({ path: "docs/lane-call-c2/answered.png" });
});
