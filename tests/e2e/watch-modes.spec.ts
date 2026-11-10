import { test, expect, type Page } from "@playwright/test";

const modes = ["Normal", "Focus", "Dialogue"] as const;
async function selectMode(page: Page, mode: string) {
  const more = page.locator(".demo-more");
  if ((await more.getAttribute("open")) === null)
    await more.locator(":scope > summary").click();
  await page
    .locator(".demo-more .phone-mode-dock")
    .getByRole("button", { name: new RegExp(`^${mode}:`) })
    .click();
  await more.locator(":scope > summary").click();
  await expect(page.locator(".watch-area")).toHaveClass(
    new RegExp(`experience-${mode.toLowerCase()}`),
  );
}
async function fresh(page: Page) {
  await page.goto("/#/together");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
}

for (const width of [1440, 390, 320]) {
  test(`three distinct modes fit the fixed watch at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 1000 });
    await fresh(page);
    const watch = page.locator(".watch");
    const size = await watch.boundingBox();
    for (const mode of modes) {
      await selectMode(page, mode);
      const home = watch.locator(`.mode-home-${mode.toLowerCase()}`);
      await expect(home).toBeVisible();
      await expect(
        home.getByRole("img", { name: /Sprout looks/ }),
      ).toBeVisible();
      const buttons = home.locator(
        ".watch-picture-card, .watch-focus-primary, .watch-more-button, .watch-dialogue-question",
      );
      await expect(buttons).toHaveCount(mode === "Dialogue" ? 3 : 2);
      if (mode === "Focus")
        await expect(
          home.getByRole("button", { name: "Help me home", exact: true }),
        ).toBeVisible();
      if (mode === "Dialogue")
        await expect(home.locator(".watch-dialogue-bubble")).toHaveText(
          "What would you like to do?",
        );
      if (mode === "Normal")
        await expect(home.getByRole("heading")).toHaveText("Hello, Alex.");
      await watch.scrollIntoViewIfNeeded();
      expect(
        await watch
          .locator(".wos-body")
          .evaluate((el) => el.scrollHeight - el.clientHeight),
      ).toBeLessThanOrEqual(2);
      const body = (await watch.locator(".wos-body").boundingBox())!;
      const mascot = (await home.locator(".mascot-touch").boundingBox())!;
      expect(mascot.y).toBeGreaterThanOrEqual(body.y);
      const footer = (await watch.locator(".wos-footer").boundingBox())!;
      for (const button of await buttons.all()) {
        const bounds = (await button.boundingBox())!;
        expect(bounds.height).toBeGreaterThanOrEqual(44);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(footer.y + 1);
      }
      expect((await watch.boundingBox())!.height).toBe(size!.height);
      expect((await watch.boundingBox())!.width).toBe(size!.width);
      await page.locator(".watch-area").screenshot({
        path: test.info().outputPath(`${mode}-${width}.png`),
        animations: "disabled",
      });
    }
    await page.reload();
    await expect(watch.locator(".mode-home-dialogue")).toBeVisible();
  });
}

test("mode changes preserve requests, observations and SOS priority", async ({
  page,
}) => {
  await fresh(page);
  const watch = page.locator(".watch");
  await page
    .locator(".care-phone")
    .getByRole("button", { name: "Send a check-in", exact: true })
    .click();
  const before = await page.evaluate(
    () => JSON.parse(localStorage.getItem("wayhome-v1")!).state,
  );
  for (const mode of modes) {
    await selectMode(page, mode);
    await expect(watch.locator("[data-watch-template=question]")).toBeVisible();
    await expect(watch.locator(".watch-welcome")).toHaveCount(0);
    await expect(
      watch.getByRole("button", { name: "I'm okay", exact: true }),
    ).toBeVisible();
    const after = await page.evaluate(
      () => JSON.parse(localStorage.getItem("wayhome-v1")!).state,
    );
    expect(after.checkIn).toEqual(before.checkIn);
    expect(after.connected).toBe(before.connected);
    expect(after.wearStatus).toBe(before.wearStatus);
  }
  await watch
    .getByRole("button", { name: "SOS Send help request", exact: true })
    .click();
  for (const mode of modes) {
    // The phone prioritizes SOS over its mode dock. Exercise a saved profile change.
    await page.evaluate(async (mode) => {
      const path = "/src/store.ts";
      const { useStore } = await import(path);
      useStore.getState().setExperienceMode(mode.toLowerCase(), "caregiver");
    }, mode);
    await expect(
      watch.getByText("Help request sent — simulation", { exact: true }),
    ).toBeVisible();
    await expect(watch.locator(".watch-status .sprout-svg")).toBeVisible();
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("wayhome-v1")!).state.mode,
      ),
    ).toBe("EMERGENCY_SIMULATED");
  }
});

test("focus and dialogue actions work and switching returns to the selected start layout", async ({
  page,
}) => {
  await fresh(page);
  const watch = page.locator(".watch");
  await selectMode(page, "Focus");
  await watch
    .getByRole("button", { name: "More choices", exact: true })
    .click();
  await watch.getByRole("button", { name: "My memories", exact: true }).click();
  await expect(watch.locator(".wos-memories")).toBeVisible();
  await selectMode(page, "Dialogue");
  await expect(watch.locator(".mode-home-dialogue")).toBeVisible();
  await selectMode(page, "Normal");
  await watch
    .getByRole("button", { name: "More choices", exact: true })
    .click();
  await expect(watch.locator(".watch-help-home .sprout-svg")).toBeVisible();
  await watch.getByRole("button", { name: "Call Jamie", exact: true }).click();
  await selectMode(page, "Focus");
  await expect(watch.locator(".wos-handover")).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("wayhome-v1")!).state.familyRequest
          .status,
    ),
  ).toBe("waiting");
});

test("offline acknowledgment and review keep full-sized actions reachable", async ({
  page,
}) => {
  await fresh(page);
  await page.evaluate(async () => {
    const path = "/src/store.ts";
    const { useStore } = await import(path);
    useStore.getState().event("DISCONNECT");
    useStore.getState().answerCheckIn("okay");
  });
  const watch = page.locator(".watch");
  await expect(watch.locator(".watch-thanks")).toBeVisible();
  const action = watch.locator(".watch-thanks .watch-action");
  await action.scrollIntoViewIfNeeded();
  expect((await action.boundingBox())!.height).toBeGreaterThanOrEqual(48);
  await page.locator(".watch-area").screenshot({
    path: test.info().outputPath("acknowledgment.png"),
    animations: "disabled",
  });
  await watch
    .getByRole("button", { name: "Back to main screen", exact: true })
    .click();
  await expect(
    watch.getByText("Your caregiver needs to check the watch.", {
      exact: true,
    }),
  ).toBeVisible();
  await selectMode(page, "Dialogue");
  await expect(watch.locator(".watch-thanks")).toBeVisible();
  await expect(watch.locator(".watch-welcome")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem("wayhome-v1")!).state.connected,
    ),
  ).toBe(false);
});

test("GitHub dialogue questions and normal conversation work through the redesigned controls", async ({
  page,
}) => {
  await fresh(page);
  const watch = page.locator(".watch");
  await selectMode(page, "Dialogue");
  const responses = [
    [
      "Where am I?",
      "I can’t confirm your location. You can ask for help getting home.",
    ],
    ["Who is my family?", "Jamie Chen cares about you and is one tap away."],
    [
      "Something comforting",
      "Take your time. You are welcome here, just as you are.",
    ],
    [
      "Tell me something nice",
      "I'm glad you're here with me. We can take this moment slowly together.",
    ],
  ];
  for (const [index, [label, reply]] of responses.entries()) {
    if (index === 2)
      await watch
        .getByRole("button", { name: "More topics", exact: true })
        .click();
    await watch.getByRole("button", { name: label, exact: true }).click();
    await expect(watch.locator(".watch-dialogue-bubble")).toHaveText(reply);
  }
  await watch
    .getByRole("button", { name: "More choices", exact: true })
    .click();
  await watch
    .getByRole("button", { name: "Help me home", exact: true })
    .click();
  await expect(watch.getByText("Stop 1 of 4", { exact: true })).toBeVisible();
  await watch
    .getByRole("button", { name: "Back to main screen", exact: true })
    .click();
  await watch
    .getByRole("button", { name: "I know my way", exact: true })
    .click();
  await selectMode(page, "Normal");
  await watch
    .getByRole("button", { name: "More choices", exact: true })
    .click();
  await watch.getByRole("button", { name: "Let's talk", exact: true }).click();
  await watch
    .getByRole("button", { name: "Who is my family?", exact: true })
    .click();
  await expect(watch.locator(".watch-dialogue-bubble")).toHaveText(
    responses[1][1],
  );
  await selectMode(page, "Focus");
  await watch.getByRole("button", { name: "Call Jamie", exact: true }).click();
  await expect(watch.locator(".wos-handover")).toBeVisible();
});

test("mode selection retains offline acknowledgment and its device review without clearing the request", async ({
  page,
}) => {
  await fresh(page);
  await page.evaluate(async () => {
    const path = "/src/store.ts";
    const { useStore } = await import(path);
    useStore.getState().event("DISCONNECT");
    useStore.getState().answerCheckIn("okay");
  });
  const before = await page.evaluate(
    () => JSON.parse(localStorage.getItem("wayhome-v1")!).state,
  );
  const watch = page.locator(".watch");
  for (const mode of ["Normal", "Focus", "Dialogue", "Dialogue", "Normal"]) {
    await selectMode(page, mode);
    await expect(watch.locator(".watch-thanks")).toBeVisible();
    await expect(watch.locator(".watch-welcome")).toHaveCount(0);
    const after = await page.evaluate(
      () => JSON.parse(localStorage.getItem("wayhome-v1")!).state,
    );
    expect(after.connected).toBe(false);
    expect(after.checkIn).toEqual(before.checkIn);
    await expect(watch.locator(".watch-thanks")).toBeVisible();
  }
});

test("latest GitHub watch commands drive the redesigned guidance and keep SOS priority", async ({
  page,
}) => {
  await fresh(page);
  const command = async (bytes: number[]) =>
    page.evaluate(async (bytes) => {
      const blePath = "/src/services/ble.ts";
      const devicePath = "/src/services/device.ts";
      const { companionEvent } = await import(blePath);
      const { applyDeviceEvent } = await import(devicePath);
      const event = companionEvent(new DataView(new Uint8Array(bytes).buffer));
      if (event) applyDeviceEvent(event);
    }, bytes);
  await command([0x06]);
  await expect(
    page.locator(".watch").getByText("Stop 1 of 4", { exact: true }),
  ).toBeVisible();
  await command([0x07, 1]);
  await expect(
    page.locator(".watch").getByText("Stop 2 of 4", { exact: true }),
  ).toBeVisible();
  await page
    .locator(".watch")
    .getByRole("button", { name: "SOS Send help request", exact: true })
    .click();
  await command([0x06]);
  await command([0x07, 2]);
  await expect(
    page
      .locator(".watch")
      .getByText("Help request sent — simulation", { exact: true }),
  ).toBeVisible();
});
