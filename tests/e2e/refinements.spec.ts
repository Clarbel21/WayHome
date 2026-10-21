import { test, expect } from "@playwright/test";
import { resolveIncident } from "./support";
const picture = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXxkAAAAASUVORK5CYII=",
  "base64",
);

test("incident acknowledgment and reset preserve faults; fresh SOS cancels verification", async ({
  page,
  context,
}) => {
  await page.goto("/#/demo");
  await page.getByRole("button", { name: /Simulate Wearable Removal/ }).click();
  await page
    .getByRole("button", { name: /Simulate Device Disconnection/ })
    .click();
  await page.getByRole("button", { name: /Trigger Simulated SOS/ }).click();
  await page.goto("/#/caregiver/emergency");
  await page
    .getByRole("button", { name: "Acknowledge emergency event" })
    .click();
  await expect(page.getByText(/Incident lifecycle: active/)).toBeVisible();
  await page
    .getByRole("button", { name: "Request incident resolution", exact: true })
    .click();
  await page
    .getByLabel("I have independently checked on the wearer in this simulation")
    .check();
  await expect(
    page.getByRole("button", { name: "Verify resolution and close incident" }),
  ).toBeDisabled();
  await expect(
    page.getByText("Device is disconnected", { exact: true }),
  ).toBeVisible();
  let data = await page.evaluate(
    () => JSON.parse(localStorage.getItem("wayhome-v1")!).state,
  );
  expect(data.connected).toBe(false);
  expect(data.wearStatus).toBe("unknown");
  expect(data.worn).toBe(false);
  const wearer = await context.newPage();
  await wearer.goto("/#/companion");
  await wearer.getByRole("button", { name: "SOS Hold for 2 seconds" }).focus();
  await wearer.keyboard.down("Space");
  await wearer.waitForTimeout(2100);
  await wearer.keyboard.up("Space");
  await expect(page.getByText(/Incident lifecycle: active/)).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Verification required · S5 remains active",
    }),
  ).not.toBeVisible();
  await page
    .getByRole("button", { name: "Restore simulated connection" })
    .click();
  await expect(
    page.locator(".wearable-config").getByText(/Wear inference: Unknown/),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Simulate likely worn", exact: true })
    .click();
  await resolveIncident(page);
  data = await page.evaluate(
    () => JSON.parse(localStorage.getItem("wayhome-v1")!).state,
  );
  expect(data.incident.stage).toBe("resolved");
  expect(data.wearStatus).toBe("likely_worn");
  await expect(
    wearer.getByText("Hi! I'm Sprout. I'm here with you."),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByText(/Incident lifecycle: resolved/)).toBeVisible();
});

test("all scenario reasons, low-confidence guidance gate, and attachment-specific uncertainty", async ({
  page,
}) => {
  await page.goto("/#/demo");
  for (const name of [
    "Simulate route deviation",
    "Simulate prolonged inactivity",
    "Simulate missed check-ins",
    "Simulate low GPS confidence",
  ]) {
    await page
      .getByRole("button", {
        name: "Clear simulated scenario readings",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", {
        name: "Review check-in after observations",
        exact: true,
      })
      .click();
    await page.getByRole("button", { name, exact: true }).click();
    await expect(page.locator(".safety-findings li")).toHaveCount(1);
  }
  await page.getByRole("button", { name: /Start Guided Return/ }).click();
  let data = await page.evaluate(
    () => JSON.parse(localStorage.getItem("wayhome-v1")!).state,
  );
  expect(data.mode).toBe("CHECK_IN");
  await expect(
    page
      .locator(".demo-twin")
      .getByText("Are you feeling okay?", { exact: true }),
  ).toBeVisible();
  await page.goto("/#/caregiver/settings");
  const config = page.locator(".wearable-config");
  for (const [attachment, first, second] of [
    ["pendant", "Lanyard fastened", "Near-body proximity"],
    ["clip", "Clip attached", "Garment movement"],
    ["wristwatch", "Strap closed", "Skin contact"],
  ]) {
    await page.getByLabel("Attachment configuration").selectOption(attachment);
    await expect(config.getByText(/Wear inference: Unknown/)).toBeVisible();
    await page.getByLabel(first, { exact: true }).selectOption("yes");
    await page.getByLabel(second, { exact: true }).selectOption("no");
    await page
      .getByRole("button", { name: "Record attachment observations" })
      .click();
    await expect(
      config.getByText(/Wear inference: Possibly removed/),
    ).toBeVisible();
    await page.getByLabel(first, { exact: true }).selectOption("no");
    await page
      .getByRole("button", { name: "Record attachment observations" })
      .click();
    await expect(config.getByText(/Wear inference: Not worn/)).toBeVisible();
    await page
      .getByRole("button", { name: "Simulate likely worn", exact: true })
      .click();
    await expect(config.getByText(/Wear inference: Likely worn/)).toBeVisible();
  }
  await page.reload();
  await expect(page.getByLabel("Attachment configuration")).toHaveValue(
    "wristwatch",
  );
  await expect(config.getByText(/not guaranteed/).first()).toBeVisible();
});

test("approved memory photo remains separate from navigation until explicit approval; photo is independent", async ({
  page,
}) => {
  await page.goto("/#/caregiver/library");
  await page.getByRole("button", { name: "Add memory", exact: true }).click();
  await page.getByLabel("Activity type").selectOption("places");
  await page
    .getByLabel("Place name", { exact: true })
    .fill("Family rose garden");
  await page
    .getByLabel("Personal memory description")
    .fill(
      "We enjoyed tea here. This is a memory, not a navigation instruction.",
    );
  await page.getByLabel(/Photograph/).setInputFiles({
    name: "garden.png",
    mimeType: "image/png",
    buffer: picture,
  });
  await page.getByLabel("Approved for Companion Mode", { exact: true }).check();
  await page.getByRole("button", { name: "Save memory", exact: true }).click();
  const card = page.locator(".memory-library-entry").filter({
    has: page.getByRole("heading", {
      name: "Family rose garden",
      exact: true,
    }),
  });
  await card
    .getByRole("button", { name: "Propose for landmark guidance" })
    .click();
  await expect(
    page
      .getByRole("dialog", {
        name: "Propose a memory place for navigation",
        exact: true,
      })
      .getByRole("textbox", {
        name: "Proposed simple navigation instruction",
        exact: true,
      }),
  ).toHaveValue("");
  await page
    .getByRole("textbox", {
      name: "Proposed simple navigation instruction",
      exact: true,
    })
    .fill("Walk toward the rose garden gate.");
  await page.getByRole("button", { name: "Create pending landmark" }).click();
  await expect(
    card.getByText(/Separate navigation approval is required/),
  ).toBeVisible();
  await page.goto("/#/caregiver/landmarks");
  const pending = page.locator(".landmark-card").filter({
    has: page.getByRole("heading", {
      name: "Family rose garden",
      exact: true,
    }),
  });
  await expect(pending.getByRole("checkbox")).not.toBeChecked();
  await expect(
    pending.getByText("Walk toward the rose garden gate.", { exact: true }),
  ).toBeVisible();
  for (const checkbox of await page.getByRole("checkbox").all())
    if (await checkbox.isChecked()) await checkbox.uncheck();
  await page.goto("/#/companion");
  await page.getByRole("button", { name: "Help me get home" }).click();
  await expect(page.getByText("No approved landmarks yet.")).toBeVisible();
  await page.goto("/#/caregiver/landmarks");
  await pending.getByRole("checkbox").check();
  await page.goto("/#/caregiver/library");
  await page
    .getByRole("button", { name: "Delete memory Family rose garden" })
    .click();
  await page.goto("/#/companion");
  await expect(
    page.getByText("Family rose garden", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".watch-landmark img")).toHaveJSProperty(
    "naturalWidth",
    1,
  );
  await page.reload();
  await expect(page.locator(".watch-landmark img")).toHaveJSProperty(
    "naturalWidth",
    1,
  );
});

test("optional recommendations reflect caregiver choices without starting a game and remain usable on mobile", async ({
  page,
}) => {
  await page.goto("/#/caregiver/library");
  await page.getByLabel("Preferred interaction duration").selectOption("short");
  await page.goto("/#/memories");
  await page.getByRole("button", { name: "Let's begin", exact: true }).click();
  await expect(
    page.getByText(/Your caregiver prefers a brief moment/),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Does this person look familiar?" }),
  ).not.toBeVisible();
  await page
    .getByRole("button", { name: "Familiar Faces", exact: true })
    .click();
  await page.getByRole("button", { name: /Skip this activity/ }).click();
  await expect(
    page.getByText(/Perhaps a different kind of memory/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Familiar Faces", exact: true }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.goto("/#/caregiver/settings");
  await page.getByLabel("Attachment configuration").selectOption("pendant");
  await page
    .getByRole("button", { name: "Simulate likely worn", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.locator(".wearable-config").getByText(/Wear inference: Likely worn/),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
