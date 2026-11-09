import { test, expect, type Page } from "@playwright/test";
import { wakeWatch, openWatchHelp, openWatchMemories } from "./watch-helpers";

const watch = (page: Page) => page.locator(".watch");
const main = (page: Page) =>
  watch(page).getByRole("button", { name: "Back to main screen", exact: true });
async function fresh(page: Page) {
  await page.goto("/#/together");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
}
async function atHome(page: Page) {
  await expect(
    watch(page).getByRole("button", {
      name: "Say hello to Sprout",
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    watch(page).getByText("Hello, Alex.", { exact: true }),
  ).toBeVisible();
}

test("home shows two clear choices and a mascot that reacts to touch and respects reduced motion", async ({
  page,
}) => {
  await fresh(page);
  await atHome(page);
  await expect(watch(page).getByRole("button")).toHaveCount(4); // Two choices, mascot and physical SOS.
  expect(
    await watch(page)
      .locator(".sprout-figure")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("sprout-breathe");
  await watch(page).scrollIntoViewIfNeeded();
  const initialMascot = (await watch(page)
    .locator(".mascot-touch")
    .boundingBox())!;
  await wakeWatch(page);
  const openedMascot = (await watch(page)
    .locator(".mascot-touch")
    .boundingBox())!;
  expect(openedMascot.y).toBeCloseTo(initialMascot.y, 1);
  expect(openedMascot.x).toBeCloseTo(initialMascot.x, 1);
  expect(openedMascot.width).toBe(initialMascot.width);
  expect(openedMascot.height).toBe(initialMascot.height);
  await expect(
    watch(page).getByRole("group", { name: "Watch screen", exact: true }),
  ).toBeFocused();
  await expect(
    watch(page).getByText("It’s lovely to see you.", { exact: true }),
  ).toBeVisible();
  await expect(watch(page).locator(".watch-picture-card")).toHaveCount(2);
  await watch(page)
    .getByRole("button", { name: "Talk with Sprout", exact: true })
    .click();
  await expect(
    watch(page).getByText("I’m here with you.", { exact: true }),
  ).toBeVisible();
  await expect(watch(page).locator(".watch-welcome")).toHaveClass(
    /mascot-touched/,
  );
  await main(page).click();
  await atHome(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await watch(page)
      .locator(".sprout-figure")
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
});

test("Home returns from help, memories, an activity and route practice while preserving activity progress", async ({
  page,
}) => {
  await fresh(page);
  const size = (await watch(page).boundingBox())!;
  await openWatchHelp(page);
  await expect(
    watch(page).getByRole("button", { name: "Call Jamie", exact: true }),
  ).toBeVisible();
  await main(page).click();
  await atHome(page);
  await openWatchMemories(page);
  await watch(page)
    .getByRole("button", { name: "Familiar Faces", exact: true })
    .click();
  await main(page).click();
  await atHome(page);
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem("wayhome-memory-v1")!).state.session,
  );
  expect(saved.paused).toBe(true);
  await openWatchMemories(page);
  await expect(
    watch(page).getByRole("button", { name: "Resume activity", exact: true }),
  ).toBeVisible();
  await watch(page)
    .getByRole("button", { name: "Something else", exact: true })
    .click();
  await watch(page)
    .getByRole("button", { name: "Practice my way home", exact: true })
    .click();
  await main(page).click();
  await atHome(page);
  expect((await watch(page).boundingBox())!.height).toBe(size.height);
  expect((await watch(page).boundingBox())!.width).toBe(size.width);
});

test("Home offers an explicit guidance exit and cannot clear an SOS", async ({
  page,
}) => {
  await fresh(page);
  await openWatchHelp(page);
  await watch(page)
    .getByRole("button", { name: "Help me home", exact: true })
    .click();
  await main(page).click();
  await expect(
    watch(page).getByText("Would you like to end directions?", { exact: true }),
  ).toBeVisible();
  await watch(page)
    .getByRole("button", { name: "I know my way", exact: true })
    .click();
  await atHome(page);
  const sos = watch(page).getByRole("button", {
    name: "SOS Send help request",
    exact: true,
  });
  await sos.click();
  await main(page).click();
  await expect(
    watch(page).getByText("Your SOS is still active.", { exact: true }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("wayhome-v1")!).state.mode,
    ),
  ).toBe("EMERGENCY_SIMULATED");
  await watch(page)
    .getByRole("button", { name: "Go back", exact: true })
    .click();
  await expect(
    watch(page).getByText("Help request sent — simulation", { exact: true }),
  ).toBeVisible();
  await watch(page)
    .getByRole("button", { name: "Help received — resolve SOS", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Caregiver confirms — resolve SOS",
      exact: true,
    })
    .click();
  await atHome(page);
});

test("check-in and family request have working return paths without invented responses", async ({
  page,
}) => {
  await fresh(page);
  const phone = page.locator(".care-phone");
  await phone
    .getByRole("button", { name: "Send a check-in", exact: true })
    .click();
  await main(page).click();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("wayhome-v1")!).state.checkIn.response,
    ),
  ).toBeUndefined();
  await watch(page)
    .getByRole("button", { name: "I'm okay", exact: true })
    .click();
  await main(page).click();
  await atHome(page);
  await openWatchHelp(page);
  await watch(page)
    .getByRole("button", { name: "Call Jamie", exact: true })
    .click();
  await expect(main(page)).toHaveCount(0);
  await phone
    .getByRole("button", { name: "Acknowledge family request", exact: true })
    .click();
  await phone
    .getByRole("button", { name: "Simulate caregiver response", exact: true })
    .click();
  await watch(page)
    .getByRole("button", { name: "I'm ready to continue", exact: true })
    .click();
  await main(page).click();
  await atHome(page);
});

test("the minimal watch remains fixed and usable on a narrow screen and after demo reset", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await fresh(page);
  const first = (await watch(page).boundingBox())!;
  await wakeWatch(page);
  await openWatchHelp(page);
  await expect(main(page)).toBeVisible();
  await main(page).click();
  await openWatchMemories(page);
  expect((await watch(page).boundingBox())!.height).toBe(first.height);
  await page.getByRole("button", { name: "Reset demo", exact: true }).click();
  await atHome(page);
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(320);
  await page.locator(".watch-area").screenshot({
    path: test.info().outputPath("minimal-mobile.png"),
    animations: "disabled",
  });
});

test("waiting screen keeps only a stationary mascot and its replies", async ({
  page,
}) => {
  await fresh(page);
  await openWatchHelp(page);
  await watch(page)
    .getByRole("button", { name: "Call Jamie", exact: true })
    .click();
  const screen = watch(page).locator(".wos-handover");
  await expect(screen.locator(".wos-steps, .watch-simulation")).toHaveCount(0);
  await expect(main(page)).toHaveCount(0);
  await expect(screen.getByRole("button")).toHaveCount(1);
  const mascot = screen.getByRole("button", {
    name: "Talk with Sprout",
    exact: true,
  });
  const position = (await mascot.boundingBox())!;
  await expect(screen.getByRole("status")).toHaveText("");
  for (const reply of [
    "It’s lovely to see you.",
    "I’m here with you.",
    "We can take our time.",
    "You are cared for.",
  ]) {
    await mascot.click();
    await expect(screen.getByRole("status")).toHaveText(reply);
    const current = (await mascot.boundingBox())!;
    expect(current.x).toBeCloseTo(position.x, 1);
    expect(current.y).toBeCloseTo(position.y, 1);
    expect(current.width).toBe(position.width);
    expect(current.height).toBe(position.height);
  }
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("wayhome-v1")!).state.familyRequest
          .status,
    ),
  ).toBe("waiting");
  await page.locator(".watch-area").screenshot({
    path: test.info().outputPath("stationary-mascot.png"),
    animations: "disabled",
  });
});

for (const width of [390, 320]) {
  test(`touch replies and one-tap SOS work on a ${width}px screen`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width, height: 844 },
      hasTouch: true,
      isMobile: true,
    });
    const page = await context.newPage();
    await fresh(page);
    await watch(page)
      .getByRole("button", { name: "Say hello to Sprout", exact: true })
      .tap();
    await watch(page)
      .getByRole("button", { name: "Talk with Sprout", exact: true })
      .tap();
    await expect(
      watch(page).getByText("I’m here with you.", { exact: true }),
    ).toBeVisible();
    await openWatchHelp(page);
    await watch(page)
      .getByRole("button", { name: "Call Jamie", exact: true })
      .tap();
    await watch(page)
      .getByRole("button", { name: "Talk with Sprout", exact: true })
      .tap();
    const body = watch(page).locator(".wos-body");
    expect(
      await body.evaluate((el) => el.scrollHeight - el.clientHeight),
    ).toBeLessThanOrEqual(2);
    await page.locator(".watch-area").screenshot({
      path: test.info().outputPath("touch-waiting.png"),
      animations: "disabled",
    });
    await watch(page)
      .getByRole("button", { name: "SOS Send help request", exact: true })
      .tap();
    await expect(
      watch(page).getByText("Help request sent — simulation", { exact: true }),
    ).toBeVisible();
    await expect(
      page
        .locator(".care-phone")
        .getByRole("button", { name: "Acknowledge SOS alert", exact: true }),
    ).toBeVisible();
    await context.close();
  });
}
