import { test, expect, type Page } from "@playwright/test";

// Step 5: the "+8 min" ladder must be visible on both devices at the same
// step. The watch carries the short wearer wording; the phone carries the
// ladder detail and both expose the same data-step for this check.

const watch = (page: Page) => page.locator(".watch-area .watch").first();
const phone = (page: Page) =>
  page.getByRole("region", { name: "A little closer.", exact: true });
const moments = (page: Page) =>
  page.getByRole("toolbar", { name: "Demo moments" });
const watchStep = (page: Page, step: number) =>
  watch(page).locator(`.wos-body [data-step="${step}"]`).first();

async function expectSameStep(page: Page, step: number, watchWords: RegExp) {
  await expect(watchStep(page, step)).toBeVisible();
  await expect(watchStep(page, step)).toContainText(watchWords);
  await expect(watch(page).getByText(`Step ${step} of 4`)).toBeVisible();
  await expect(phone(page).locator(`.zone-ladder[data-step="${step}"]`)).toBeVisible();
  await expect(
    phone(page).getByText(`Step ${step} of 4`, { exact: true }),
  ).toBeVisible();
  // One-frame rule: the new watch copy must never scroll or clip.
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const el = document.querySelector(".wos-body");
        return el ? el.scrollHeight - el.clientHeight : 0;
      }),
    )
    .toBeLessThanOrEqual(2);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/#/together");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("every +8 min ladder step shows on the watch and the phone together", async ({
  page,
}) => {
  await moments(page)
    .getByRole("button", { name: "Walk out of safe zone" })
    .click();

  await expectSameStep(page, 1, /Go home\?/);
  await expect(watch(page).getByRole("button", { name: "I'm okay here" })).toBeVisible();

  await moments(page).getByRole("button", { name: "+8 min" }).click();
  await expectSameStep(page, 2, /Still outside\?/);
  // The step-2 buzzing is what tells the wearer the ladder moved on.
  await expect(page.locator(".watch-area").first()).toHaveClass(/buzz/);
  await expect(
    phone(page).locator(".zone-ladder li.done", { hasText: "Notify Jamie" }),
  ).toBeVisible();
  await expect(watch(page).getByRole("button", { name: "I'm okay here" })).toBeVisible();

  await moments(page).getByRole("button", { name: "+8 min" }).click();
  await expectSameStep(page, 3, /Call family\?/);
  await expect(watchStep(page, 3)).toContainText("Caregiver alerted");
  await expect(
    watch(page).getByRole("button", { name: "Call family", exact: true }),
  ).toBeVisible();
  await expect(
    watch(page).getByRole("button", { name: "Yes, go home", exact: true }),
  ).toBeVisible();

  await moments(page).getByRole("button", { name: "+8 min" }).click();
  await expect(
    watch(page).getByText("Help is coming. · Demo", { exact: true }),
  ).toBeVisible();
  await expect(phone(page).getByText("Urgent", { exact: true })).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const el = document.querySelector(".wos-body");
        return el ? el.scrollHeight - el.clientHeight : 0;
      }),
    )
    .toBeLessThanOrEqual(2);
});

test("the watch still offers a way home after the wearer declines step 2", async ({
  page,
}) => {
  await moments(page).getByRole("button", { name: "Lost far from home" }).click();
  await expectSameStep(page, 1, /Go home\?/);
  await moments(page).getByRole("button", { name: "+8 min" }).click();
  await expectSameStep(page, 2, /Still outside\?/);

  await watch(page).getByRole("button", { name: "I'm okay here" }).click();
  await expect(watchStep(page, 2)).toContainText("Still outside?");
  await expect(page.locator(".watch-area").first()).toHaveClass(/zone-alert/);
  await watch(page).getByRole("button", { name: "Yes, go home" }).click();
  await expect(phone(page).getByText(/escalation paused/)).toBeVisible();
});
