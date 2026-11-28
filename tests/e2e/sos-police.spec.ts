import { expect, test, type Page } from "@playwright/test";

async function holdSos(page: Page) {
  await page.goto("/#/together");
  const watch = page.locator(".watch-area").first();
  const phone = page.locator(".care-phone").first();
  await watch.getByRole("button", { name: /SOS Hold for 3 seconds/ }).focus();
  await page.keyboard.down("Space");
  await page.waitForTimeout(3400);
  await page.keyboard.up("Space");
  await expect(watch.getByText("Help is coming. · Demo", { exact: true })).toBeVisible();
  return { watch, phone };
}

test("SOS offers the nearest demo station and records a simulated call", async ({ page }) => {
  const { watch, phone } = await holdSos(page);
  await expect(phone.getByText("Call the police?", { exact: true })).toBeVisible();
  await expect(phone.getByText("Garden District Police Station")).toBeVisible();
  await expect(phone.getByText("98 m away · simulated")).toBeVisible();
  await phone.getByRole("button", { name: "Call police", exact: true }).click();
  await expect(phone.getByText("Calling Garden District Police Station · Demo, no real call")).toBeVisible();
  await expect(watch.getByText("Help is coming. · Demo", { exact: true })).toBeVisible();
  await expect(watch.locator(".wos-body")).toHaveText(
    /^Help is coming\. · Demo\s*Help is here$/,
  );
  await phone.getByRole("button", { name: "Updates", exact: true }).click();
  await expect(phone.getByText("Simulated police notification · no police were contacted · Garden District Police Station")).toBeVisible();
});

test("Not now keeps the normal SOS card and remembers the decision", async ({ page }) => {
  const { watch, phone } = await holdSos(page);
  await phone.getByRole("button", { name: "Not now", exact: true }).click();
  await page.reload();
  await expect(phone.getByRole("heading", { name: "Simulated SOS" })).toBeVisible();
  await expect(phone.getByRole("button", { name: "Call police", exact: true })).toHaveCount(0);
  await expect(watch.getByText("Help is coming. · Demo", { exact: true })).toBeVisible();
  await phone.getByRole("button", { name: "Updates", exact: true }).click();
  await expect(phone.getByText(/Simulated police notification/)).toHaveCount(0);
});
