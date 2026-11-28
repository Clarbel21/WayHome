import { expect, test } from "@playwright/test";

test("Home speaks each route step, respects the Care tools mute, and cancels on exit", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const events: string[] = [];
    Object.defineProperty(window, "wayhomeSpeechEvents", { value: events });
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        speak: (utterance: SpeechSynthesisUtterance) =>
          events.push(utterance.text),
        cancel: () => events.push("cancel"),
      },
    });
  });
  const read = () =>
    page.evaluate(
      () =>
        (window as Window & { wayhomeSpeechEvents?: string[] })
          .wayhomeSpeechEvents ?? [],
    );
  const clear = () =>
    page.evaluate(() => {
      const events = (window as Window & { wayhomeSpeechEvents?: string[] })
        .wayhomeSpeechEvents;
      if (events) events.length = 0;
    });
  await page.goto("/#/together");
  const watch = page.locator(".watch-area").first();
  const phone = page.locator(".care-phone").first();
  const start = () =>
    watch.getByRole("button", { name: "Help me home", exact: true }).click();
  const back = () =>
    watch.getByRole("button", { name: "I know my way", exact: true }).click();
  const advance = () =>
    watch.getByRole("button", { name: "I see it", exact: true }).click();
  const voice = phone.getByRole("checkbox", { name: "Spoken companion cues" });
  const openSettings = async () => {
    await phone
      .getByRole("button", { name: "Care tools", exact: true })
      .click();
    await phone.getByRole("button", { name: /Settings/ }).click();
  };

  await start();
  await expect(
    watch.getByRole("button", { name: "I see it", exact: true }),
  ).toBeVisible();
  expect(await read()).toEqual([]);
  await back();

  await openSettings();
  await voice.check();
  await expect.poll(async () => (await read()).length).toBe(1);
  await clear();
  await start();
  const garden = "Do you see the Community garden? Go straight.";
  const right = "Turn right at the Community garden.";
  const left = "Turn left at the Neighborhood bakery.";
  await expect.poll(read).toEqual(["cancel", garden]);
  await advance();
  await expect.poll(read).toEqual(["cancel", garden, "cancel", right]);

  await openSettings();
  await voice.uncheck();
  await expect
    .poll(read)
    .toEqual(["cancel", garden, "cancel", right, "cancel"]);
  await clear();
  await advance();
  expect(await read()).toEqual([]);

  await voice.check();
  await expect.poll(read).toEqual([left]);
  await back();
  await expect.poll(read).toEqual([left, "cancel"]);

  await clear();
  await start();
  for (let step = 0; step < 4; step++) await advance();
  await expect(watch.getByText("Welcome home.", { exact: true })).toBeVisible();
  await expect
    .poll(read)
    .toEqual([
      garden,
      "cancel",
      right,
      "cancel",
      left,
      "cancel",
      "Turn right at the Local library.",
      "cancel",
    ]);
});
