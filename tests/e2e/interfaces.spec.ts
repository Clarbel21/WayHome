import { openMore, showWatch, showCaregiver } from "./watch-helpers";
import { test, expect } from "@playwright/test";

test("wearer and caregiver phone sit side by side and share working check-ins", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/#/together");
  await openMore(page);
  await expect(
    page.getByRole("button", { name: "Connect Sprout watch", exact: true }),
  ).toBeVisible();
  await page.locator(".demo-more > summary").click();
  const wearer = page.getByRole("region", {
    name: "Alex’s watch",
    exact: true,
  });
  const caregiver = page.getByRole("region", {
    name: "Jamie’s app",
    exact: true,
  });
  const left = await wearer.boundingBox(),
    right = await caregiver.boundingBox();
  expect(left!.x + left!.width).toBeLessThan(right!.x);
  expect(Math.abs(left!.y - right!.y)).toBeLessThan(3);
  await caregiver
    .getByRole("button", { name: "Send a check-in", exact: true })
    .click();
  await expect(
    wearer.getByText("How are you feeling?", { exact: true }),
  ).toBeVisible();
  await wearer.getByRole("button", { name: "I'm okay", exact: true }).click();
  await expect(
    caregiver.getByRole("heading", { name: "No active alerts", exact: true }),
  ).toBeVisible();
  await caregiver.getByRole("button", { name: /Updates/ }).click();
  await expect(
    caregiver
      .getByRole("region", { name: "Check-in responses" })
      .getByText(/I'm okay/),
  ).toBeVisible();
  await caregiver
    .getByRole("button", { name: "Care tools", exact: true })
    .click();
  await expect(
    caregiver.getByRole("link", {
      name: "Open caregiver workspace",
      exact: true,
    }),
  ).toBeVisible();
});

test("same-screen caregiver response works and SOS stays separate from acknowledgment", async ({
  page,
}) => {
  await page.goto("/#/companion");
  const wearer = page.getByRole("region", {
    name: "Alex’s watch",
    exact: true,
  });
  const caregiver = page.getByRole("region", {
    name: "Jamie’s app",
    exact: true,
  });
  await caregiver
    .getByRole("button", { name: "Send a check-in", exact: true })
    .click();
  await wearer
    .getByRole("button", { name: "I'd like some help", exact: true })
    .click();
  await wearer
    .getByRole("button", { name: "Call someone I trust", exact: true })
    .click();
  await expect(
    caregiver.getByRole("button", { name: "Send a check-in", exact: true }),
  ).toHaveCount(0);
  await caregiver
    .getByRole("button", { name: "Acknowledge family request", exact: true })
    .click();
  await caregiver
    .getByRole("button", { name: "Simulate caregiver response", exact: true })
    .click();
  await wearer
    .getByRole("button", { name: "I'm ready to continue", exact: true })
    .click();
  await expect(
    wearer.getByText("Thank you, Alex.", { exact: true }),
  ).toBeVisible();
  await wearer
    .getByRole("button", { name: "SOS Send help request", exact: true })
    .focus();
  await page.keyboard.press("Space");
  await caregiver
    .getByRole("button", { name: "Acknowledge SOS alert", exact: true })
    .click();
  await expect(
    wearer.getByText("Help request sent — simulation", { exact: true }),
  ).toBeVisible();
  await expect(
    caregiver.getByRole("button", {
      name: "Review and resolve SOS",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    caregiver.getByRole("button", { name: "Send a check-in", exact: true }),
  ).toHaveCount(0);
});

test("mobile tabs switch interfaces without overflow and caregiver workspace navigation stays usable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/#/companion");
  await expect(page.locator(".wearer-interface")).toBeVisible();
  await expect(page.locator(".caregiver-interface")).toBeHidden();
  await showCaregiver(page);
  await expect(page.locator(".caregiver-interface")).toBeVisible();
  await expect(page.locator(".wearer-interface")).toBeHidden();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Care tools", exact: true }).click();
  await page
    .getByRole("link", { name: "Open caregiver workspace", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Looking out for Alex.", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Toggle navigation", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Side-by-side view", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/together$/);
});

test("phone hardware keeps portrait proportions and navigation stays fixed while content scrolls", async ({
  page,
}) => {
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/#/together");
    const phone = page.locator(".care-phone");
    const box = (await phone.boundingBox())!;
    expect(box.height / box.width).toBeGreaterThan(1.9);
    expect(box.height / box.width).toBeLessThan(2.15);
    const nav = page.getByRole("navigation", {
      name: "Phone views",
      exact: true,
    });
    const before = (await nav.boundingBox())!;
    await page
      .locator(".phone-scroll")
      .evaluate((e) => (e.scrollTop = e.scrollHeight));
    expect((await nav.boundingBox())!.y).toBe(before.y);
    await nav.getByRole("button", { name: "Care tools", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "Your care tools", exact: true }),
    ).toBeVisible();
    expect(
      await page.locator(".phone-scroll").evaluate((e) => e.scrollTop),
    ).toBe(0);
    await page
      .getByRole("button", { name: "View notifications", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Little moments. Shared.",
        exact: true,
      }),
    ).toBeVisible();
    // Decorative hardware must never intercept the emergency control.
    const sos = page.getByRole("button", {
      name: "SOS Send help request",
      exact: true,
    });
    await sos.scrollIntoViewIfNeeded();
    expect(
      await sos.evaluate((e) => {
        const r = e.getBoundingClientRect();
        return e.contains(
          document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2),
        );
      }),
    ).toBe(true);
  }
});

test("SOS remains discoverable while caregiver browses tools", async ({
  page,
}) => {
  await page.goto("/#/together");
  await page.getByRole("button", { name: "Care tools", exact: true }).click();
  await page
    .getByRole("button", { name: "SOS Send help request", exact: true })
    .focus();
  await page.keyboard.press("Space");
  await expect(page.locator(".care-priority")).toHaveAttribute(
    "data-priority",
    "sos-new",
  );
  await page
    .getByRole("button", { name: "Acknowledge SOS alert", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Review and resolve SOS", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send a check-in", exact: true }),
  ).toHaveCount(0);
});
