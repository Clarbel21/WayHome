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
  await expect(watch(page).getByText("Hi! Want to chat with me?")).toBeVisible();
  await expect(watch(page).getByRole("textbox")).toHaveCount(0);
  await expect(watch(page).getByRole("button", { name: "Type" })).toHaveCount(
    0,
  );
  await sayToMomo(page, "Where am I?");
  await expect(watch(page).getByText("“Where am I?”")).toBeVisible();
  // T3: the simulated where-am-I answer.
  await expect(watch(page).getByText("Near home · Demo")).toBeVisible();
});

test('saying "take me home" starts the guided walk (T2)', async ({ page }) => {
  await watch(page).getByRole("button", { name: "Let's talk", exact: true }).click();
  await expect(watch(page).getByText("Hi! Want to chat with me?")).toBeVisible();
  await sayToMomo(page, "Take me home");
  // Momo confirms out loud and on screen...
  await expect(watch(page).getByText("Okay, let's go home.")).toBeVisible();
  // ...then hands over to the guide-home screen (H1): photo + I see it.
  await expect(
    watch(page).getByRole("button", { name: "I see it", exact: true }),
  ).toBeVisible({ timeout: 10000 });
  await expect(watch(page).locator(".wos-talk")).toHaveCount(0);
});

test('saying "pulang" (Indonesian) also starts the guided walk', async ({ page }) => {
  await watch(page).getByRole("button", { name: "Let's talk", exact: true }).click();
  await expect(watch(page).getByText("Hi! Want to chat with me?")).toBeVisible();
  await sayToMomo(page, "Aku mau pulang");
  await expect(watch(page).getByText("Okay, let's go home.")).toBeVisible();
  await expect(
    watch(page).getByRole("button", { name: "I see it", exact: true }),
  ).toBeVisible({ timeout: 10000 });
});

test("quiet: Momo asks once, then goes home", async ({ page }) => {
  await watch(page).getByRole("button", { name: "Let's talk", exact: true }).click();
  await expect(watch(page).locator(".wos-talk")).toBeVisible();
  // First 7 s of silence: one gentle check, still on Talk.
  await expect(watch(page).getByText("Are you still there?")).toBeVisible({ timeout: 9000 });
  await expect(watch(page).locator(".wos-talk")).toBeVisible();
  // Second quiet spell: back home.
  await expect(watch(page).locator(".wos-emoji-grid")).toBeVisible({ timeout: 9000 });
});

test("inside the safe zone Momo asks to chat; Not now goes home", async ({ page }) => {
  await watch(page).getByRole("button", { name: "Let's talk", exact: true }).click();
  await expect(watch(page).getByText("Hi! Want to chat with me?")).toBeVisible();
  await watch(page).getByRole("button", { name: "Let's chat" }).click();
  await expect(watch(page).getByText("Lovely! What shall we talk about?")).toBeVisible();
  await watch(page).getByRole("button", { name: /Back/ }).click();
  await page.evaluate(() => delete (window as any).__momoRec);
  await watch(page).getByRole("button", { name: "Let's talk", exact: true }).click();
  await sayToMomo(page, "Not now");
  await expect(watch(page).locator(".wos-emoji-grid")).toBeVisible({ timeout: 5000 });
});

test('saying "call Jamie" rings the family contact (T3)', async ({ page }) => {
  await watch(page)
    .getByRole("button", { name: "Let's talk", exact: true })
    .click();
  await expect(watch(page).getByText("Hi! Want to chat with me?")).toBeVisible();
  await sayToMomo(page, "Call Jamie");
  // The call lane (C2) ringing screen opens for the family contact.
  await expect(watch(page).locator(".wos-ringing")).toBeVisible();
  await expect(
    watch(page).getByText("Ringing…", { exact: true }),
  ).toBeVisible();
});

test('saying "call my daughter" calls the same person (T3)', async ({
  page,
}) => {
  await watch(page)
    .getByRole("button", { name: "Let's talk", exact: true })
    .click();
  await expect(watch(page).getByText("Hi! Want to chat with me?")).toBeVisible();
  await sayToMomo(page, "Call my daughter");
  await expect(watch(page).locator(".wos-ringing")).toBeVisible();
  await expect(watch(page).getByText("Jamie", { exact: true })).toBeVisible();
});

test("Momo answers the time, the day and where she is (T3)", async ({
  page,
}) => {
  await watch(page)
    .getByRole("button", { name: "Let's talk", exact: true })
    .click();
  await expect(watch(page).getByText("Hi! Want to chat with me?")).toBeVisible();
  await sayToMomo(page, "What time is it?");
  await expect(watch(page).getByText(/It's \d{1,2}:\d{2}/)).toBeVisible();
  await sayToMomo(page, "What day is it?");
  await expect(
    watch(page).getByText(
      /It's (Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\./,
    ),
  ).toBeVisible();
  await sayToMomo(page, "Where am I?");
  await expect(watch(page).getByText("Near home · Demo")).toBeVisible();
});
