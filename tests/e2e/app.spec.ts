import { test, expect } from "@playwright/test";
test("caregiver simulation, landmark editing, settings and persistence", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Enter Caregiver Dashboard" }).click();
  await expect(
    page.getByRole("heading", { name: "Looking out for Alex." }),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Demo control center", exact: true })
    .click();
  await page.getByRole("button", { name: /Simulate Disorientation/ }).click();
  await expect(page.getByText("It's okay. I'm here with you.")).toBeVisible();
  await page.getByRole("button", { name: /Trigger Simulated SOS/ }).click();
  await expect(page.getByText("Help request sent — simulation")).toBeVisible();
  await page
    .getByRole("link", { name: /Alerts/, exact: false })
    .first()
    .click();
  await expect(
    page.getByText("Simulated SOS · help request received"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Mark all as read" }).click();
  await expect(page.getByText("Read", { exact: true }).first()).toBeVisible();
  await page
    .getByRole("link", { name: "Familiar landmarks", exact: true })
    .click();
  await page.getByRole("button", { name: "Add landmark", exact: true }).click();
  await page.getByLabel("Name", { exact: true }).fill("Favorite café");
  await page
    .getByLabel("Simple navigation instruction")
    .fill("Walk to the green door.");
  await page.getByRole("button", { name: "Save landmark" }).click();
  await expect(
    page.getByRole("heading", { name: "Favorite café" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Favorite café" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByLabel("Wearer's display name").fill("Sam Chen");
  await page.getByRole("link", { name: "Overview", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Looking out for Sam." }),
  ).toBeVisible();
});
test("SOS hold synchronizes companion and caregiver browser tabs", async ({
  page,
  context,
}) => {
  await page.goto("/companion");
  const caregiver = await context.newPage();
  await caregiver.goto("/caregiver/alerts");
  const sos = page.getByRole("button", { name: "SOS Hold for 2 seconds" });
  await sos.focus();
  await page.keyboard.down("Space");
  await page.waitForTimeout(2100);
  await page.keyboard.up("Space");
  await expect(page.getByText("Help request sent — simulation")).toBeVisible();
  await expect(
    caregiver.getByText("Simulated SOS · help request received"),
  ).toBeVisible();
});
test("guided presentation completes all eight steps and route works offline", async ({
  page,
}) => {
  await page.goto("/guided");
  await page.getByRole("button", { name: "Begin story" }).click();
  for (let i = 0; i < 7; i++)
    await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Help request sent — simulation")).toBeVisible();
  await page.getByRole("button", { name: "Reset presentation" }).click();
  await expect(page.getByRole("button", { name: "Begin story" })).toBeVisible();
  await page.route("**/*.tile.openstreetmap.org/**", (route) => route.abort());
  await page.goto("/caregiver/location");
  await expect(
    page.getByText("Offline route · simulated neighborhood"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Move one step" }).click();
  await expect(page.getByText("17% of simulated route complete")).toBeVisible();
});
test("mobile layout stays within the viewport and navigation works", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("link", { name: "Enter Companion Mode" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.goto("/caregiver");
  await page.getByRole("button", { name: "Toggle navigation" }).click();
  await page
    .getByRole("link", { name: "Demo control center", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Every moment, connected." }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("wearer recognition returns home, empty approval offers help, and a short SOS hold cancels", async ({
  page,
}) => {
  await page.goto("/companion");
  await page.getByRole("button", { name: "Help me get home" }).click();
  await expect(
    page.getByText("Community garden", { exact: true }),
  ).toBeVisible();
  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: "I see it · Next step" }).click();
  await page.getByRole("button", { name: "I'm home", exact: true }).click();
  await expect(
    page.getByText("Hi! I'm Sprout. I'm here with you."),
  ).toBeVisible();
  const sos = page.getByRole("button", { name: "SOS Hold for 2 seconds" });
  await sos.focus();
  await page.keyboard.down("Space");
  await page.waitForTimeout(150);
  await page.keyboard.up("Space");
  await expect(
    page.getByText("Help request sent — simulation"),
  ).not.toBeVisible();
  await page.goto("/caregiver/landmarks");
  for (const checkbox of await page.getByRole("checkbox").all())
    await checkbox.uncheck();
  await page.goto("/companion");
  await page.getByRole("button", { name: "Help me get home" }).click();
  await expect(page.getByText("No approved landmarks yet.")).toBeVisible();
  await page.getByRole("button", { name: "Contact my caregiver" }).click();
  await expect(
    page.getByText("Caregiver notification sent — simulation"),
  ).toBeVisible();
});
