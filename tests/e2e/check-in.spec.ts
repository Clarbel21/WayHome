import { test, expect, type Page } from "@playwright/test";
async function start(page: Page) {
  await page.goto("/#/demo");
  await page
    .getByRole("button", { name: "Start feeling check-in", exact: true })
    .click();
  await page.goto("/#/companion");
  await expect(
    page.getByText("How are you feeling?", { exact: true }),
  ).toBeVisible();
}
test("okay reassures and persists response", async ({ page }) => {
  await start(page);
  await page.getByRole("button", { name: "I'm okay", exact: true }).click();
  await expect(
    page.getByText("Thank you for telling me. I'm here with you.", {
      exact: true,
    }),
  ).toBeVisible();
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem("wayhome-v1")!).state,
  );
  expect(saved.checkInHistory[0].response).toBe("okay");
  expect(saved.checkInHistory[0].respondedAt).toBeGreaterThan(0);
});
test("help, recognition and failed recognition stop guidance", async ({
  page,
}) => {
  await start(page);
  await page.getByRole("button", { name: "I need help", exact: true }).click();
  for (const label of ["Help me get home", "Contact my family", "I'm confused"])
    await expect(
      page.getByRole("button", { name: label, exact: true }),
    ).toBeVisible();
  await page
    .getByRole("button", { name: "Help me get home", exact: true })
    .click();
  await expect(
    page.getByText("Community garden", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "I see it", exact: true }).click();
  await expect(
    page.getByText("Neighborhood bakery", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "I don't see it", exact: true })
    .click();
  await expect(
    page.getByText(
      "That's okay. We'll stop these directions. Your family can help.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "I see it", exact: true }),
  ).toHaveCount(0);
});
test("family handover acknowledgment and simulated response synchronize tabs", async ({
  page,
  context,
}) => {
  await start(page);
  await page.getByRole("button", { name: "I need help", exact: true }).click();
  await page
    .getByRole("button", { name: "Contact my family", exact: true })
    .click();
  await expect(
    page.getByText("Waiting for caregiver response", { exact: true }),
  ).toBeVisible();
  const caregiver = await context.newPage();
  await caregiver.goto("/#/caregiver/alerts");
  await caregiver
    .getByRole("button", { name: "Acknowledge family request", exact: true })
    .click();
  await expect(
    page.getByText("Your caregiver has seen your request.", { exact: true }),
  ).toBeVisible();
  await caregiver
    .getByRole("button", { name: "Simulate caregiver response", exact: true })
    .click();
  await expect(
    page.getByText(
      "Jamie Chen has responded in this demo. They are here to help.",
      { exact: true },
    ),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Continue after response", exact: true })
    .click();
  await expect(
    page.getByText("Hi! I'm Sprout. I'm here with you.", { exact: true }),
  ).toBeVisible();
});
test("confusion offers support without a recognition test", async ({
  page,
}) => {
  await start(page);
  await page.getByRole("button", { name: "I need help", exact: true }).click();
  await page.getByRole("button", { name: "I'm confused", exact: true }).click();
  await expect(
    page.getByText(
      "It's okay to feel unsure. Take your time. I'm here with you.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(page.locator(".watch-landmark img")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Contact my family", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "I see it", exact: true }),
  ).toHaveCount(0);
});
test("real timeout repeats once then notifies without declaring lost", async ({
  page,
}) => {
  await page.clock.install();
  await start(page);
  await page.clock.fastForward(30001);
  await expect(
    page.getByText(
      "I'm here with you. When you're ready, tell me how you feel.",
      { exact: true },
    ),
  ).toBeVisible();
  await page.clock.fastForward(30001);
  await expect(
    page.getByText("Waiting for caregiver response", { exact: true }),
  ).toBeVisible();
  await page.goto("/#/caregiver/alerts");
  await expect(
    page.getByText(
      "Unresolved check-in — no response after one gentle repeat",
      { exact: true },
    ),
  ).toBeVisible();
});
test("SOS interrupts help choices and okay cannot bypass the incident", async ({
  page,
}) => {
  await start(page);
  await page.getByRole("button", { name: "I need help", exact: true }).click();
  await page
    .getByRole("button", { name: "SOS Hold for 2 seconds", exact: true })
    .focus();
  await page.keyboard.down("Space");
  await page.waitForTimeout(2150);
  await page.keyboard.up("Space");
  await expect(
    page.getByText("Help request sent — simulation", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "I'm okay", exact: true }),
  ).toHaveCount(0);
  await page.goto("/#/demo");
  await expect(
    page.getByRole("button", { name: /Simulate Successful Reorientation/ }),
  ).toBeDisabled();
  await expect(
    page.getByText("Help request sent — simulation", { exact: true }),
  ).toBeVisible();
});
