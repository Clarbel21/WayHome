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
test("caregiver confirmation ends SOS and allows memories despite preserved device warnings", async ({
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
      .getByText("Device is disconnected", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", {
      name: "Caregiver confirms — resolve SOS",
      exact: true,
    })
    .click();
  const state = await page.evaluate(
    () => JSON.parse(localStorage.getItem("wayhome-v1")!).state,
  );
  expect(state.incident.stage).toBe("resolved");
  expect(state.mode).toBe("CHECK_IN");
  expect(state.connected).toBe(false);
  expect(state.worn).toBe(false);
  await page
    .getByRole("link", { name: "Explore Memories", exact: true })
    .click();
  await expect(
    page.getByText(/SOS is resolved. Local memories can continue/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Let's begin", exact: true }).click();
  await page
    .getByRole("button", { name: "Familiar Faces", exact: true })
    .click();
  await page.getByRole("button", { name: "Tell me more", exact: true }).click();
  await expect(page.getByText(/This is your daughter, Mei/)).toBeVisible();
  await page.reload();
  await expect(page.getByText(/This is your daughter, Mei/)).toBeVisible();
  await sos(page);
  await expect(
    page.getByRole("heading", { name: "Memory Garden is paused", exact: true }),
  ).toBeVisible();
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

test("a delayed browser timer still recognizes a full SOS hold exactly once on release", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const schedule = window.setTimeout.bind(window);
    window.setTimeout = ((
      handler: TimerHandler,
      delay?: number,
      ...args: unknown[]
    ) =>
      schedule(
        handler,
        delay === 2000 ? 10000 : delay,
        ...args,
      )) as typeof window.setTimeout;
  });
  await page.goto("/#/companion");
  await sos(page);
  const count = await page.evaluate(
    () =>
      JSON.parse(localStorage.getItem("wayhome-v1")!).state.alerts.filter(
        (a: { emergency?: { kind: string } }) => a.emergency?.kind === "sos",
      ).length,
  );
  expect(count).toBe(1);
});

test("caregiver dashboard confirmation also allows continuing memories with pending wear review", async ({
  page,
}) => {
  await page.goto("/#/demo");
  await page.getByRole("button", { name: /Simulate Wearable Removal/ }).click();
  await page.getByRole("button", { name: /Trigger Simulated SOS/ }).click();
  await page.goto("/#/caregiver/emergency");
  await page
    .getByRole("button", { name: "Request incident resolution", exact: true })
    .click();
  await page
    .getByLabel("I have independently checked on the wearer in this simulation")
    .check();
  await page
    .getByRole("button", {
      name: "Verify resolution and close incident",
      exact: true,
    })
    .click();
  await expect(
    page.getByText(/SOS is resolved. Device review is still pending/),
  ).toBeVisible();
  await page
    .getByRole("link", { name: "Return to Memory Garden", exact: true })
    .click();
  await page.getByRole("button", { name: "Let's begin", exact: true }).click();
  await page
    .getByRole("button", { name: "Familiar Faces", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Does this person look familiar?" }),
  ).toBeVisible();
});
