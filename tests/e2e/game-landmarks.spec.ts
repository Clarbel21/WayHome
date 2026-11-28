import { test, expect, type Page } from "@playwright/test";

// G1 — Familiar landmarks on the web watch. One photo, two big names, calm
// feedback, four rounds, then "Well done!". The quiz shell is data-driven so
// G2 (faces) and G3 (happy places) can reuse the same screens and assertions.

const watchOf = (page: Page) => page.locator(".watch-area .watch").first();

async function openPlaces(page: Page) {
  const watch = watchOf(page);
  await watch.getByRole("button", { name: "Game", exact: true }).click();
  await expect(watch.locator(".wos-game-pick")).toBeVisible();
  await watch.getByRole("button", { name: "Places", exact: true }).click();
}

async function openFresh(page: Page) {
  await page.goto("/#/companion");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await watchOf(page).waitFor();
}

async function expectOneFrame(page: Page) {
  await expect
    .poll(async () =>
      page.evaluate(() => {
        const h = (el: Element | null) =>
          el ? el.scrollHeight - el.clientHeight : 0;
        const w = (el: Element | null) =>
          el ? el.scrollWidth - el.clientWidth : 0;
        return Math.max(
          h(document.querySelector(".wos-body")),
          w(document.querySelector(".wos-body")),
          h(document.querySelector(".watch-screen.wos")),
          w(document.querySelector(".watch-screen.wos")),
        );
      }),
    )
    .toBeLessThanOrEqual(2);
}

async function expectBigAndTappable(page: Page) {
  const sizes = await page.evaluate(() => {
    const quiz = document.querySelector<HTMLElement>(".wos-game");
    const px = (selector: string) =>
      quiz?.querySelector<HTMLElement>(selector)
        ? parseFloat(
            getComputedStyle(quiz.querySelector<HTMLElement>(selector)!)
              .fontSize,
          )
        : 0;
    const buttons = [...(quiz?.querySelectorAll("button") ?? [])].map(
      (b) => b.getBoundingClientRect().height,
    );
    return {
      round: px(".wos-game-round"),
      prompt: px(".wos-game-prompt"),
      result: px(".wos-game-result"),
      done: px(".wos-game-done-text"),
      buttons,
    };
  });
  for (const size of [sizes.round, sizes.prompt, sizes.result, sizes.done])
    if (size > 0) expect(size).toBeGreaterThanOrEqual(15);
  expect(sizes.buttons.length).toBeGreaterThan(0);
  for (const height of sizes.buttons) expect(height).toBeGreaterThanOrEqual(44);
  // Every control stays inside the watch body, clear of the SOS bar.
  const inside = await page.evaluate(() => {
    const body = document.querySelector(".wos-body")?.getBoundingClientRect();
    if (!body) return false;
    return [...document.querySelectorAll(".wos-game button")].every((b) => {
      const r = b.getBoundingClientRect();
      return r.top >= body.top - 1 && r.bottom <= body.bottom + 1;
    });
  });
  expect(inside).toBe(true);
}

test("four landmark rounds use gentle words, big choices and one frame", async ({
  page,
}) => {
  await openFresh(page);
  const watch = watchOf(page);
  await openPlaces(page);
  const quiz = watch.locator(".wos-game");
  await expect(quiz).toHaveClass(/wos-game-question/);
  await expect(quiz.locator(".wos-game-round")).toHaveText("Round 1 of 4");
  await expect(quiz.locator("img")).toHaveCount(1);
  await expect(quiz.locator(".wos-game-choice")).toHaveCount(2);
  await expect(quiz.locator("img")).toHaveAttribute(
    "src",
    /images\/quiz-garden\.svg/,
  );
  await expect(quiz.locator(".wos-game-prompt")).toHaveText(
    "Which place is this?",
  );
  await expectBigAndTappable(page);
  await expectOneFrame(page);
  const photo = (await quiz.locator("img").boundingBox())!;
  const choice = (await quiz
    .locator(".wos-game-choice")
    .first()
    .boundingBox())!;
  expect(photo.height).toBeGreaterThan(choice.height);

  // Round 1: right answer stays cheerful, without saying "wrong" anywhere.
  await quiz.getByRole("button", { name: /^garden$/i }).click();
  await expect(quiz).toHaveAttribute("data-result", "right");
  await expect(quiz.locator(".wos-game-result")).toHaveText(
    "Yes! That's the garden.",
  );
  expect((await quiz.innerText()).toLowerCase()).not.toContain("wrong");
  await expectBigAndTappable(page);
  await expectOneFrame(page);

  // Round 2: the exact happy line for the bakery.
  await quiz.getByRole("button", { name: "Next", exact: true }).click();
  await expect(quiz.locator(".wos-game-round")).toHaveText("Round 2 of 4");
  await expect(quiz.locator("img")).toHaveAttribute(
    "src",
    /images\/quiz-bakery\.svg/,
  );
  await quiz.getByRole("button", { name: /^bakery$/i }).click();
  await expect(quiz.locator(".wos-game-result")).toHaveText(
    "Yes! That's the bakery.",
  );
  await expectOneFrame(page);

  // Round 3: a miss teaches the name; it never calls the answer wrong.
  await quiz.getByRole("button", { name: "Next", exact: true }).click();
  await expect(quiz.locator(".wos-game-round")).toHaveText("Round 3 of 4");
  await expect(quiz.locator("img")).toHaveAttribute(
    "src",
    /images\/quiz-library\.svg/,
  );
  await quiz.getByRole("button", { name: /^home$/i }).click();
  await expect(quiz).toHaveAttribute("data-result", "gentle");
  await expect(quiz.locator(".wos-game-result")).toHaveText(
    "That's the library.",
  );
  expect((await quiz.innerText()).toLowerCase()).not.toContain("wrong");
  await expectBigAndTappable(page);
  await expectOneFrame(page);

  // Round 4: home, then a short finish and a way back to the home screen.
  await quiz.getByRole("button", { name: "Next", exact: true }).click();
  await expect(quiz.locator(".wos-game-round")).toHaveText("Round 4 of 4");
  await expect(quiz.locator("img")).toHaveAttribute(
    "src",
    /images\/quiz-home\.svg/,
  );
  await quiz.getByRole("button", { name: /^home$/i }).click();
  await expect(quiz.locator(".wos-game-result")).toHaveText(
    "Yes! That's the home.",
  );
  await quiz.getByRole("button", { name: "Next", exact: true }).click();
  await expect(quiz).toHaveClass(/wos-game-done/);
  await expect(quiz.locator(".wos-game-done-text")).toHaveText("Well done!");
  await expectBigAndTappable(page);
  await expectOneFrame(page);

  await quiz.getByRole("button", { name: "Back to home", exact: true }).click();
  await expect(
    watch.getByRole("button", { name: "Help me home" }),
  ).toBeVisible();
  await expect(watch.locator(".wos-game")).toHaveCount(0);
});

test("the game fits the small stage and safety takes over mid-round", async ({
  page,
}) => {
  await page.setViewportSize({ width: 880, height: 700 });
  await openFresh(page);
  const watch = watchOf(page);
  await openPlaces(page);
  const quiz = watch.locator(".wos-game");
  await expectBigAndTappable(page);
  await expectOneFrame(page);

  await page.locator(".sos-hold").first().click({ delay: 3300 });
  await expect(page.getByText("Help is coming. · Demo").first()).toBeVisible();
  await expect(watch.locator(".wos-game")).toHaveCount(0);
  await expectOneFrame(page);
});
