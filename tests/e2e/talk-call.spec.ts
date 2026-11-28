import { test, expect, type Page } from "@playwright/test";
import { installFakeSpeech, sayToMomo } from "./helpers/fakeSpeech";

// Talk is like a call with Momo: no Type button, she listens by herself,
// and 7 s with no reply returns to the home screen (saves battery).
const watch = (page: Page) => page.locator(".watch-area .watch").first();

test.beforeEach(async ({ page }) => {
  await installFakeSpeech(page);
  await page.goto("/#/together");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("Talk listens by itself, answers, and has no typing", async ({ page }) => {
  await watch(page).getByRole("button", { name: "Let's talk", exact: true }).click();
  await expect(watch(page).getByRole("status").filter({ hasText: "Listening…" })).toBeVisible();
  await expect(watch(page).getByRole("textbox")).toHaveCount(0);
  await expect(watch(page).getByRole("button", { name: "Type" })).toHaveCount(0);
  await sayToMomo(page, "Where am I?");
  await expect(watch(page).getByText("“Where am I?”")).toBeVisible();
});

test("7 seconds of silence returns home", async ({ page }) => {
  await watch(page).getByRole("button", { name: "Let's talk", exact: true }).click();
  await expect(watch(page).locator(".wos-talk")).toBeVisible();
  await expect(watch(page).locator(".wos-emoji-grid")).toBeVisible({ timeout: 9000 });
  await expect(watch(page).locator(".wos-talk")).toHaveCount(0);
});
