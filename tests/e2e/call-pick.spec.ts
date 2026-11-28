import { test, expect, type Page } from "@playwright/test";

// Call lane C1: Call → "Who to call?" → three big faces → the picked person
// is asked on the caregiver phone. No real call is made.

const watch = (page: Page) => page.locator(".watch-area .watch").first();
const phone = (page: Page) => page.locator(".care-phone").first();

async function openFresh(page: Page) {
  await page.goto("/#/together");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(phone(page)).toBeVisible();
  await expect(watch(page)).toBeVisible();
}

test("Call shows three faces that fit, and the picked person is asked", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await openFresh(page);
  await watch(page).getByRole("button", { name: "Call family", exact: true }).click();
  await expect(watch(page).getByText("Who to call?")).toBeVisible();
  const faces = watch(page).locator(".wos-call-face");
  await expect(faces).toHaveCount(3);
  for (const box of await faces.evaluateAll((els) =>
    els.map((e) => e.getBoundingClientRect().height),
  ))
    expect(box).toBeGreaterThanOrEqual(44);
  const overflow = await page.evaluate(() => {
    const el = document.querySelector(".wos-body")!;
    return el.scrollHeight - el.clientHeight;
  });
  expect(overflow).toBeLessThanOrEqual(2);
  await page.waitForTimeout(700);
  await page.screenshot({ path: "docs/lane-call-c1/after-watch-pick.png" });

  await watch(page).getByRole("button", { name: "Call family: Sam" }).click();
  await expect(watch(page).getByText("Sam").first()).toBeVisible();
  await expect(phone(page).getByText(/wants to call Sam/)).toBeVisible();
  await page.waitForTimeout(700);
  await page.screenshot({ path: "docs/lane-call-c1/after-call-sam.png" });
});

test("Back from Who to call? returns home", async ({ page }) => {
  await openFresh(page);
  await watch(page).getByRole("button", { name: "Call family", exact: true }).click();
  await watch(page).getByRole("button", { name: /Back/ }).click();
  await expect(watch(page).locator(".wos-emoji-grid")).toBeVisible();
});
