import { expect, test } from "@playwright/test";

test.use({ reducedMotion: "reduce" });

test("wearing options support keyboard selection and load their product images", async ({
  page,
}) => {
  await page.goto("/#/");
  const wrist = page.getByRole("tab", { name: "01 Wrist" });
  await wrist.focus();
  await page.keyboard.press("ArrowRight");
  const pendant = page.getByRole("tab", { name: "02 Pendant" });
  await expect(pendant).toBeFocused();
  await expect(pendant).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toHaveAccessibleName("02 Pendant");
  await expect(
    page.getByRole("heading", { name: "A personal touch." }),
  ).toBeVisible();
  await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: "03 Clip" })).toBeFocused();
  const image = page.getByRole("tabpanel").getByRole("img");
  await expect(image).toHaveAttribute("src", /clip\.webp$/);
  await expect
    .poll(() => image.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
  await page.keyboard.press("Home");
  await expect(wrist).toHaveAttribute("aria-selected", "true");
});

test("landing preview responds without changing persisted companion state", async ({
  page,
}) => {
  await page.goto("/#/");
  const before = await page.evaluate(() => localStorage.getItem("wayhome-v1"));
  await page.getByRole("button", { name: "I'm okay", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "I'm glad you're feeling okay." }),
  ).toBeVisible();
  await page.getByRole("button", { name: /A familiar way forward/ }).click();
  await page.getByRole("button", { name: "I recognise it" }).click();
  await expect(
    page.getByRole("heading", { name: "One familiar step at a time." }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Your people, closer/ }).click();
  await page.getByRole("button", { name: "Ask for a check-in" }).click();
  await expect(
    page.getByRole("heading", { name: "Your demo request is received." }),
  ).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("wayhome-v1"))).toBe(
    before,
  );
  await page
    .getByRole("link", { name: "Enter Companion Mode", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/companion$/);
  await expect(
    page.getByRole("button", { name: "SOS Hold for 2 seconds" }),
  ).toBeVisible();
});
