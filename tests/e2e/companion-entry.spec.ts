import { test, expect } from "@playwright/test";
test("Explore Memories opens and begins an activity on a fresh browser", async ({
  page,
}) => {
  await page.goto("/#/companion");
  await page
    .getByRole("link", { name: "Explore Memories", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/memories$/);
  await expect(
    page.getByRole("heading", { name: "Welcome to your Memory Garden." }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Let's begin", exact: true }).click();
  await page
    .getByRole("button", { name: "Familiar Faces", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Does this person look familiar?" }),
  ).toBeVisible();
});
test("old saved wear data shows an actionable pause and can be reviewed without erasing progress", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("button-test-seeded")) {
      localStorage.setItem(
        "wayhome-v1",
        JSON.stringify({
          version: 1,
          state: {
            mode: "NORMAL",
            connected: true,
            worn: true,
            settings: { wearer: "Alex Chen", companionName: "Buddy" },
          },
        }),
      );
      localStorage.setItem("button-test-seeded", "yes");
    }
  });
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto("/#/companion");
  await page
    .getByRole("link", { name: "Explore Memories", exact: true })
    .scrollIntoViewIfNeeded();
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
  await expect(
    page.getByText(
      "Memory Garden is paused. Select Explore Memories to see why and open caregiver review.",
    ),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Explore Memories", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Memory Garden is paused", exact: true }),
  ).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.getByText(/Wear status is unknown/)).toBeVisible();
  await page
    .getByRole("link", { name: "Open caregiver review (demo)" })
    .click();
  await page
    .getByRole("button", { name: "Simulate likely worn", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Review check-in after observations",
      exact: true,
    })
    .click();
  await page
    .getByRole("link", { name: "Return to Memory Garden", exact: true })
    .click();
  await expect(
    page.getByText("Hi, I'm Buddy. Would you like to explore a memory?"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Let's begin", exact: true }).click();
  await page
    .getByRole("button", { name: "Familiar Faces", exact: true })
    .click();
  await page.getByRole("button", { name: "Tell me more", exact: true }).click();
  await expect(
    page.getByRole("img", { name: /has 1 keepsakes/ }),
  ).toBeVisible();
});
test("opening paused memories during SOS gives a review route without bypassing S5", async ({
  page,
}) => {
  await page.goto("/#/companion");
  await page.getByRole("button", { name: "SOS Hold for 2 seconds" }).focus();
  await page.keyboard.down("Space");
  await page.waitForTimeout(2100);
  await page.keyboard.up("Space");
  await page
    .getByRole("link", { name: "Explore Memories", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Memory Garden is paused", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "A simulated help request still needs caregiver resolution and verification.",
    ),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Open caregiver review (demo)" })
    .click();
  await page
    .getByRole("link", { name: "Return to Memory Garden", exact: true })
    .click();
  await expect(page.getByText("Help request sent — simulation")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Let's begin", exact: true }),
  ).not.toBeVisible();
});
