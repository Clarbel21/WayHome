import { test, expect, type Page } from "@playwright/test";

// Visual contract for the isolated caregiver-phone UI. These checks describe
// the Today reading order, fit and legibility; they deliberately do not depend
// on pixel snapshots so the same assertions hold on every CI platform.

const phone = (page: Page) => page.locator(".care-phone");
const scroll = (page: Page) => page.locator(".phone-scroll");

test.beforeEach(async ({ page }) => {
  await page.goto("/#/together");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await expect(phone(page)).toBeVisible();
});

test("Today follows the caregiver reading order and fits without scrolling", async ({
  page,
}) => {
  const blocks = [
    ".cph-hero",
    ".cph-actions",
    ".cph-mode",
    ".cph-summary",
    ".cph-location",
  ];
  for (const size of [
    { width: 1440, height: 900 },
    { width: 1280, height: 720 },
  ]) {
    await page.setViewportSize(size);
    const boxes = [];
    for (const selector of blocks) {
      const box = await page.locator(selector).boundingBox();
      expect(box, `${selector} must be visible at ${size.width}`).not.toBeNull();
      boxes.push(box!);
    }
    for (let i = 1; i < boxes.length; i += 1) {
      expect(
        boxes[i].y,
        `${blocks[i]} must sit below ${blocks[i - 1]} without overlap`,
      ).toBeGreaterThanOrEqual(boxes[i - 1].y + boxes[i - 1].height - 1);
    }

    const fit = await scroll(page).evaluate((element) => ({
      content: element.scrollHeight,
      visible: element.clientHeight,
    }));
    expect(
      fit.content,
      `Today must fit inside the phone at ${size.width}x${size.height}`,
    ).toBeLessThanOrEqual(fit.visible + 1);
    const pageOverflow = await page.evaluate(
      () =>
        document.documentElement.scrollHeight -
        document.documentElement.clientHeight,
    );
    expect(pageOverflow, "the page must not scroll").toBeLessThanOrEqual(2);
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator(".cph-mode-head small")).toContainText("🌿 Normal");
  await expect(page.locator(".cph-mode-options button")).toHaveText([
    "🌿 Normal",
    "🏠 Focus",
    "💬 Dialogue",
  ]);
  await expect(page.locator(".cph-hero .cph-wearer")).toHaveText("Alex Chen");
  await expect(page.locator(".cph-hero .cph-hero-title")).toHaveText(
    "No active alerts",
  );
  await expect(
    page.getByRole("button", { name: "Send a check-in", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Find My", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".cph-mode-options button")).toHaveCount(3);
  await expect(scroll(page)).toContainText("Connected");
  await expect(
    page.getByRole("navigation", { name: "Phone views", exact: true }),
  ).toBeVisible();
});

test("every caregiver phone control is still reachable", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const nav = page.getByRole("navigation", { name: "Phone views", exact: true });
  const mode = page.locator(".cph-mode");

  const focus = mode.getByRole("button", { name: /^Focus:/ });
  await focus.click();
  await expect(focus).toHaveAttribute("aria-pressed", "true");
  await mode.getByRole("button", { name: /^Normal:/ }).click();
  await expect(
    mode.getByRole("button", { name: /^Normal:/ }),
  ).toHaveAttribute("aria-pressed", "true");

  await page
    .getByRole("button", { name: "View notifications", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Little moments. Shared." }),
  ).toBeVisible();

  await nav.getByRole("button", { name: "Care tools", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your care tools", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".phone-tool-list button")).toHaveCount(7);
  await expect(
    page.getByRole("link", { name: "Open full workspace", exact: true }),
  ).toHaveAttribute("href", "#/caregiver");

  await page.locator(".phone-tool-list").getByRole("button", {
    name: /Device & readings/,
  }).click();
  await expect(
    page.getByRole("button", { name: "Back to phone overview" }),
  ).toBeVisible();
  await expect(page.locator(".phone-readings")).toBeVisible();
  await page.getByRole("button", { name: "Back to phone overview" }).click();
  await expect(
    page.getByRole("heading", { name: "Your care tools", exact: true }),
  ).toBeVisible();

  await nav.getByRole("button", { name: "Today", exact: true }).click();
  const actions = page.locator(".cph-actions");
  await actions.getByRole("button", { name: "Find My", exact: true }).click();
  const stop = actions.getByRole("button", {
    name: "Found it — stop ringing",
    exact: true,
  });
  await expect(stop).toBeVisible();
  await stop.click();
  await expect(
    actions.getByRole("button", { name: "Find My", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Send a check-in", exact: true }),
  ).toBeEnabled();
});

test("active alerts stand out without making the calm screen alarming", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const hero = page.locator(".cph-hero");
  const background = () =>
    hero.evaluate((element) => getComputedStyle(element).backgroundColor);
  const calm = await background();
  const moments = page.getByRole("toolbar", { name: "Demo moments" });

  await moments
    .getByRole("button", { name: "Wanders off route", exact: true })
    .click();
  await expect(page.getByText("Needs attention", { exact: true })).toBeVisible();
  await expect(page.getByText("Route deviation")).toBeVisible();
  // The hero cross-fades its background; poll past the transition.
  await expect
    .poll(background, { message: "attention must differ from calm" })
    .not.toBe(calm);

  await moments.getByRole("button", { name: "SOS", exact: true }).click();
  await expect(page.getByText("Urgent", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Acknowledge SOS alert" }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Review SOS" }),
  ).toBeVisible();
  await expect
    .poll(background, { message: "urgent must differ from calm" })
    .not.toBe(calm);
  await expect(
    page.getByRole("button", { name: "Send a check-in", exact: true }),
  ).toHaveCount(0);
});

test("a wearer mode change still raises the caregiver notification", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const watch = page.getByRole("region", {
    name: "A familiar friend.",
    exact: true,
  });
  await watch.getByRole("button", { name: /^Mode ·/ }).click();
  await watch
    .getByRole("button", { name: /^Focus/ })
    .click();
  await expect(
    page.locator(".phone-popup-layer .phone-action-popup").first(),
  ).toBeVisible();
  await expect(page.locator(".phone-popup-layer")).toContainText(
    "Changed watch to Focus mode",
  );
  await expect(page.locator(".cph-mode-options button").nth(1)).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("Today text stays readable and the phone stays on the left", async ({
  page,
}) => {
  for (const size of [
    { width: 1440, height: 900 },
    { width: 1280, height: 720 },
    { width: 880, height: 700 },
  ]) {
    await page.setViewportSize(size);
    const clipped = await page.evaluate(() => {
      const result: { text: string; available: number; needed: number }[] = [];
      document.querySelectorAll<HTMLElement>(".cph-today *").forEach((el) => {
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") return;
        if (el.children.length || !(el.textContent || "").trim()) return;
        if (style.overflowX === "visible") return;
        if (el.scrollWidth > el.clientWidth + 2)
          result.push({
            text: (el.textContent || "").trim().slice(0, 40),
            available: el.clientWidth,
            needed: el.scrollWidth,
          });
      });
      return result;
    });
    expect(clipped, `no clipped text at ${size.width}x${size.height}`).toEqual(
      [],
    );
  }

  await page.setViewportSize({ width: 1440, height: 900 });
  const phoneBox = await phone(page).boundingBox();
  const watchBox = await page.locator(".watch").boundingBox();
  expect(phoneBox).not.toBeNull();
  expect(watchBox).not.toBeNull();
  expect(
    phoneBox!.x + phoneBox!.width,
    "caregiver phone must stay left of the watch",
  ).toBeLessThanOrEqual(watchBox!.x);
});

test("alert states keep live details clear of the fixed bottom navigation", async ({
  page,
}) => {
  for (const size of [
    { width: 1440, height: 900 },
    { width: 1280, height: 720 },
  ]) {
    await page.setViewportSize(size);
    await page.goto("/#/together");
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await expect(phone(page)).toBeVisible();

    await page
      .getByRole("button", { name: "Wanders off route", exact: true })
      .click();
    await expect(page.getByText("Needs attention", { exact: true })).toBeVisible();
    const location = page.locator(".cph-location");
    await expect(location).toHaveClass(/cph-location-compact/);
    const locationBox = await location.boundingBox();
    expect(locationBox, "location row must be visible in attention").not.toBeNull();
    expect(
      locationBox!.height,
      "location collapses to one short row in an alert",
    ).toBeLessThan(50);
    const attentionNav = await page.locator(".cph-nav").boundingBox();
    expect(attentionNav).not.toBeNull();
    expect(
      locationBox!.y + locationBox!.height,
      `attention location must clear the nav at ${size.width}x${size.height}`,
    ).toBeLessThanOrEqual(attentionNav!.y + 1);

    await page.getByRole("button", { name: "SOS", exact: true }).click();
    await expect(page.getByText("Urgent", { exact: true })).toBeVisible();
    const emergencyBox = await page.locator(".cph-emergency").boundingBox();
    expect(emergencyBox).not.toBeNull();
    const sosNav = await page.locator(".cph-nav").boundingBox();
    expect(sosNav).not.toBeNull();
    expect(
      emergencyBox!.y + emergencyBox!.height,
      `SOS card must clear the nav at ${size.width}x${size.height}`,
    ).toBeLessThanOrEqual(sosNav!.y + 1);

    const fit = await scroll(page).evaluate((element) => ({
      content: element.scrollHeight,
      visible: element.clientHeight,
    }));
    expect(
      fit.content,
      `alert state must fit at ${size.width}x${size.height}`,
    ).toBeLessThanOrEqual(fit.visible + 1);
  }
});
