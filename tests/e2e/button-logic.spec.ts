import { openWatchHelp } from "./watch-helpers";
import { test, expect } from "@playwright/test";

test("help has a working way back and a blocked check-in offers recovery", async ({
  page,
}) => {
  await page.goto("/#/demo");
  await page
    .getByRole("button", { name: "Start feeling check-in", exact: true })
    .click();
  await page.goto("/#/companion");
  await page
    .getByRole("button", { name: "I'd like some help", exact: true })
    .click();
  const contrasts = await page
    .locator(".watch-controls button")
    .evaluateAll((buttons) => {
      const luminance = (color: string) => {
        const rgb = color
          .match(/[\d.]+/g)!
          .slice(0, 3)
          .map(Number)
          .map((x) => {
            const n = x / 255;
            return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
          });
        return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
      };
      return buttons.map((button) => {
        const style = getComputedStyle(button),
          fg = luminance(style.color),
          bg = luminance(style.backgroundColor);
        return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
      });
    });
  for (const contrast of contrasts)
    expect(contrast).toBeGreaterThanOrEqual(4.5);
  await page.getByRole("button", { name: "Go back", exact: true }).click();
  await expect(
    page.getByText("How are you feeling?", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "I'm okay", exact: true }).click();
  await expect(
    page.getByText("Thank you, Alex.", {
      exact: true,
    }),
  ).toBeVisible();
});

test("log-only unanswered check-in can be reviewed without getting stuck", async ({
  page,
}) => {
  await page.goto("/#/demo");
  await page
    .getByLabel("Notify caregiver after unanswered repeat (simulation)")
    .uncheck();
  await page
    .getByRole("button", { name: "Start feeling check-in", exact: true })
    .click();
  const timeout = page.getByRole("button", {
    name: "Simulate response timeout",
    exact: true,
  });
  await timeout.click();
  await timeout.click();
  await expect(timeout).toBeDisabled();
  await page
    .getByRole("button", {
      name: "Review check-in after observations",
      exact: true,
    })
    .click();
  await page.goto("/#/companion");
  await expect(page.getByText("Hello, Alex.", { exact: true })).toBeVisible();
  await page.goto("/#/caregiver/alerts");
  await expect(
    page
      .getByRole("region", { name: "Check-in responses" })
      .getByText(/Caregiver review/),
  ).toBeVisible();
});

test("removal handover provides a request, response and device recovery path", async ({
  page,
}) => {
  await page.goto("/#/demo");
  await page.getByRole("button", { name: /Simulate Wearable Removal/ }).click();
  await page.goto("/#/companion");
  await page
    .getByRole("button", { name: "Call someone I trust", exact: true })
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("wayhome-v1")!).state.familyRequest
            ?.status,
      ),
    )
    .toBe("waiting");
  await page.goto("/#/caregiver/emergency");
  await page
    .getByRole("button", { name: "Acknowledge family request", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Simulate caregiver response", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Review check-in after observations",
      exact: true,
    })
    .click();
  await expect(
    page
      .getByText(
        "Thank you for telling me. Your caregiver still needs to review the safety concern.",
        { exact: true },
      )
      .first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Simulate likely worn", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Review check-in after observations",
      exact: true,
    })
    .click();
  await page.goto("/#/companion");
  await expect(page.getByText("Hello, Alex.", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Explore Memories", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Memory Garden is paused", exact: true }),
  ).toHaveCount(0);
});

test("withdrawing a landmark stops recognition across tabs instead of silently switching targets", async ({
  page,
  context,
}) => {
  await page.goto("/#/companion");
  await openWatchHelp(page);
  await page.getByRole("button", { name: "Help me home", exact: true }).click();
  await page.getByRole("button", { name: "I see it", exact: true }).click();
  await expect(
    page.getByText("Neighborhood bakery", { exact: true }),
  ).toBeVisible();
  const caregiver = await context.newPage();
  await caregiver.goto("/#/caregiver/landmarks");
  await caregiver
    .getByRole("button", { name: "Delete Community garden", exact: true })
    .click();
  await expect(
    page.getByText("Neighborhood bakery", { exact: true }),
  ).toBeVisible();
  await caregiver
    .getByRole("button", { name: "Delete Neighborhood bakery", exact: true })
    .click();
  await expect(
    page.getByText(
      "This landmark was withdrawn. Directions have stopped. Please contact your family.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "I see it", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Call someone I trust", exact: true }),
  ).toBeVisible();
});

test("SOS ignores right-click and canceled key press; one click disables conflicting controls", async ({
  page,
}) => {
  await page.goto("/#/companion");
  const sos = page.getByRole("button", {
    name: "SOS Send help request",
    exact: true,
  });
  await sos.click({ button: "right" });

  await expect(
    page.getByText("Help request sent — simulation", { exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press("Escape");
  await sos.focus();
  await page.keyboard.down("Space");
  await page
    .getByRole("button", { name: "Say hello to Sprout", exact: true })
    .focus();
  await page.keyboard.up("Space");
  await expect(
    page.getByText("Help request sent — simulation", { exact: true }),
  ).toHaveCount(0);
  await sos.click();
  await expect(
    page.getByText("Help request sent — simulation", { exact: true }),
  ).toBeVisible();
  await page.goto("/#/caregiver/location");
  await expect(
    page.getByRole("button", { name: "Reset route", exact: true }),
  ).toBeDisabled();
  await page.goto("/#/demo");
  await expect(
    page.getByRole("button", { name: "Start feeling check-in", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: /Simulate Successful Reorientation/ }),
  ).toBeDisabled();
  await page.goto("/#/guided");
  await expect(
    page.getByRole("button", { name: "Begin story", exact: true }),
  ).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Reset presentation", exact: true }),
  ).toBeDisabled();
});
