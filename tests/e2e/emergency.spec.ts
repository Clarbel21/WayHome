import { test, expect } from "@playwright/test";

test("Buddy persists across modes; police confirmation, acknowledgment and reset stay local", async ({
  page,
  context,
}) => {
  const external: string[] = [];
  context.on("request", (req) => {
    const url = new URL(req.url());
    if (
      ["http:", "https:"].includes(url.protocol) &&
      url.hostname !== "127.0.0.1" &&
      !url.hostname.endsWith(".tile.openstreetmap.org")
    )
      external.push(req.url());
  });
  await page.goto("/#/caregiver/settings");
  await page.getByLabel("Avatar name").fill("Buddy");
  await page.getByRole("button", { name: "Save companion name" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Companion name saved." }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Avatar name")).toHaveValue("Buddy");
  const companion = await context.newPage();
  await companion.goto("/#/companion");
  await expect(
    companion.getByText("Hi! I'm Buddy. I'm here with you."),
  ).toBeVisible();
  await companion
    .getByRole("button", { name: "SOS Hold for 2 seconds" })
    .focus();
  await companion.keyboard.down("Space");
  await companion.waitForTimeout(2100);
  await companion.keyboard.up("Space");
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "A moment with Buddy" }),
  ).toBeVisible();
  await expect(
    page.getByText("Simulated SOS · help request received"),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Emergency Assistance", exact: true })
    .click();
  await expect(
    page.getByText("SIMULATION — No police were contacted", { exact: true }),
  ).toBeVisible();
  const police = page.getByRole("button", {
    name: "Simulate Police Notification",
    exact: true,
  });
  await police.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Confirm simulation" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(police).toBeFocused();
  await police.click();
  await page
    .getByLabel("Alert reason")
    .fill("Alex needs help at the sample garden.");
  await page.getByRole("button", { name: "Confirm simulation" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page
      .getByRole("definition")
      .filter({ hasText: "Alex needs help at the sample garden." }),
  ).toBeVisible();
  await expect(
    page.getByText("Simulated police notification", { exact: true }),
  ).toBeVisible();
  await expect(
    companion.getByText("Help request sent — simulation"),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Acknowledge emergency event" })
    .click();
  await expect(
    page.getByText(/Caregiver acknowledged by Jamie Chen/),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByText(/Caregiver acknowledged by Jamie Chen/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset emergency state" }).click();
  await expect(
    companion.getByText("Hi! I'm Buddy. I'm here with you."),
  ).toBeVisible();
  await page.getByRole("link", { name: "View full alert history" }).click();
  await expect(
    page.getByText("Simulated police notification · no police were contacted"),
  ).toBeVisible();
  await expect(
    page.getByText("Emergency simulation reset by caregiver"),
  ).toBeVisible();
  expect(external).toEqual([]);
  expect(await page.locator('a[href^="tel:"]').count()).toBe(0);
});

test("name validation, Unicode, reset, and legacy persistence defaults", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("legacy-seeded")) {
      localStorage.setItem(
        "wayhome-v1",
        JSON.stringify({
          version: 1,
          state: {
            settings: {
              wearer: "Legacy Alex",
              caregiver: "Legacy Jamie",
              voice: false,
              notifications: false,
            },
          },
        }),
      );
      localStorage.setItem("legacy-seeded", "yes");
    }
  });
  await page.goto("/#/caregiver/settings");
  await expect(page.getByLabel("Avatar name")).toHaveValue("Sprout");
  await expect(page.getByLabel("Wearer's display name")).toHaveValue(
    "Legacy Alex",
  );
  const input = page.getByLabel("Avatar name");
  const save = page.getByRole("button", { name: "Save companion name" });
  await input.fill(" ");
  await save.click();
  await expect(page.getByRole("alert")).toHaveText(/1–24 characters/);
  await input.fill("a".repeat(25));
  await save.click();
  await expect(page.getByRole("alert")).toHaveText(/1–24 characters/);
  await input.fill("爷爷的小宝 🌱");
  await save.click();
  await page.reload();
  await expect(input).toHaveValue("爷爷的小宝 🌱");
  await page.getByRole("button", { name: "Reset to Default" }).click();
  await expect(input).toHaveValue("Sprout");
  await page.reload();
  await expect(input).toHaveValue("Sprout");
  await expect(page.getByLabel("Caregiver's name")).toHaveValue("Legacy Jamie");
});

test("mobile emergency controls and confirmation work with keyboard", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/caregiver/emergency");
  const trigger = page.getByRole("button", {
    name: "Simulate Police Notification",
    exact: true,
  });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByLabel("Alert reason").fill("Mobile keyboard demonstration");
  const confirm = page.getByRole("button", { name: "Confirm simulation" });
  await confirm.focus();
  await page.keyboard.press("Enter");
  await expect(
    page
      .getByRole("definition")
      .filter({ hasText: "Mobile keyboard demonstration" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Reset emergency state" }).click();
  await expect(
    page.getByRole("button", { name: "Reset emergency state" }),
  ).toBeDisabled();
});
