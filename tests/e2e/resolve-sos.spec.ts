import { test, expect } from "@playwright/test";
async function sos(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "SOS Hold for 2 seconds" }).focus();
  await page.keyboard.down("Space");
  await page.waitForTimeout(2100);
  await page.keyboard.up("Space");
  await expect(page.getByText("Help request sent — simulation")).toBeVisible();
}
test("resolved SOS can return to the companion with confirmation while preserving history", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/companion");
  await sos(page);
  await page
    .getByRole("button", { name: "Help received — resolve SOS", exact: true })
    .click();
  const modal = page.getByRole("dialog");
  await expect(
    modal.getByRole("button", { name: "Keep SOS active" }),
  ).toBeFocused();
  await modal.getByRole("button", { name: "Keep SOS active" }).click();
  await expect(page.getByText("Help request sent — simulation")).toBeVisible();
  await page
    .getByRole("button", { name: "Help received — resolve SOS", exact: true })
    .click();
  await modal
    .getByRole("button", {
      name: "Caregiver confirms — resolve SOS",
      exact: true,
    })
    .click();
  await expect(
    page.getByText("Hi! I'm Sprout. I'm here with you."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Help received — resolve SOS",
      exact: true,
    }),
  ).not.toBeVisible();
  await page.reload();
  await expect(
    page.getByText("Hi! I'm Sprout. I'm here with you."),
  ).toBeVisible();
  await page.goto("/#/caregiver/alerts");
  await expect(
    page.getByText("Simulated SOS · help request received"),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Incident resolved after explicit caregiver verification — no guarantee of safety",
    ),
  ).toBeVisible();
});
test("the shortcut cannot hide disconnected or removed device observations", async ({
  page,
}) => {
  await page.goto("/#/demo");
  await page.getByRole("button", { name: /Simulate Wearable Removal/ }).click();
  await page
    .getByRole("button", { name: /Simulate Device Disconnection/ })
    .click();
  await page.getByRole("button", { name: /Trigger Simulated SOS/ }).click();
  await page.goto("/#/companion");
  await page
    .getByRole("button", { name: "Help received — resolve SOS", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "Caregiver confirms — resolve SOS" }),
  ).toBeDisabled();
  await expect(
    page
      .getByRole("dialog")
      .getByText("Device is disconnected", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Open caregiver review", exact: true })
    .click();
  const state = await page.evaluate(
    () => JSON.parse(localStorage.getItem("wayhome-v1")!).state,
  );
  expect(state.mode).toBe("EMERGENCY_SIMULATED");
  expect(state.connected).toBe(false);
  expect(state.worn).toBe(false);
});
test("a fresh SOS invalidates an open resolution confirmation", async ({
  page,
  context,
}) => {
  await page.goto("/#/companion");
  await sos(page);
  await page
    .getByRole("button", { name: "Help received — resolve SOS", exact: true })
    .click();
  const other = await context.newPage();
  await other.goto("/#/companion");
  await sos(other);
  await expect(
    page
      .getByRole("dialog")
      .getByText(
        "A new SOS arrived. Close this confirmation and review the latest request.",
      ),
  ).toBeVisible();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "Caregiver confirms — resolve SOS" }),
  ).toBeDisabled();
});
