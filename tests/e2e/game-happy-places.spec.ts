import { test, expect, type Page } from "@playwright/test";

// G3 — happy places on the web watch. The third picker deck reuses PhotoQuiz,
// with four illustrated places and one short family memory after answering.

const watchOf = (page: Page) => page.locator(".watch-area .watch").first();

async function openFresh(page: Page) {
  await page.goto("/#/companion");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await watchOf(page).waitFor();
}

async function openHappyPlaces(page: Page) {
  const watch = watchOf(page);
  await watch.getByRole("button", { name: "Game", exact: true }).click();
  await expect(watch.locator(".wos-game-pick")).toBeVisible();
  await watch
    .getByRole("button", { name: "Happy places", exact: true })
    .click();
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
    const px = (selector: string) => {
      const el = quiz?.querySelector<HTMLElement>(selector);
      return el ? parseFloat(getComputedStyle(el).fontSize) : 0;
    };
    return {
      title: px(".wos-game-pick-title"),
      round: px(".wos-game-round"),
      prompt: px(".wos-game-prompt"),
      reply: px(".wos-game-reply"),
      memory: px(".wos-game-memory"),
      done: px(".wos-game-done-text"),
      buttons: [...(quiz?.querySelectorAll("button") ?? [])].map(
        (b) => b.getBoundingClientRect().height,
      ),
    };
  });
  for (const size of [
    sizes.title,
    sizes.round,
    sizes.prompt,
    sizes.reply,
    sizes.memory,
    sizes.done,
  ])
    if (size > 0) expect(size).toBeGreaterThanOrEqual(15);
  expect(sizes.buttons.length).toBeGreaterThan(0);
  for (const height of sizes.buttons) expect(height).toBeGreaterThanOrEqual(44);
  const inside = await page.evaluate(() => {
    const body = document.querySelector(".wos-body")?.getBoundingClientRect();
    if (!body) return false;
    return [...document.querySelectorAll(".wos-game button")].every((b) => {
      const r = b.getBoundingClientRect();
      return r.top >= body.top - 1 && r.bottom <= body.bottom + 1;
    });
  });
  expect(inside).toBe(true);
  await expect(watchOf(page).locator(".sos-hold")).toBeVisible();
}

test("happy places adds a third picker choice with big, tappable buttons", async ({
  page,
}) => {
  await openFresh(page);
  const watch = watchOf(page);
  await watch.getByRole("button", { name: "Game", exact: true }).click();
  const picker = watch.locator(".wos-game-pick");
  await expect(picker).toBeVisible();
  await expect(picker.locator(".wos-game-choice")).toHaveText([
    "Places",
    "Faces",
    "Happy places",
  ]);
  await expectBigAndTappable(page);
  await expectOneFrame(page);
  await expect(watch.locator("input, textarea")).toHaveCount(0);
  await picker.getByRole("button", { name: "Back to home" }).click();
  await expect(
    watch.getByRole("button", { name: "Help me home", exact: true }),
  ).toBeVisible();
});

test("four happy-place rounds show one memory line and gentle words", async ({
  page,
}) => {
  await openFresh(page);
  await openHappyPlaces(page);
  const watch = watchOf(page);
  const quiz = watch.locator(".wos-game");

  await expect(quiz).toHaveClass(/wos-game-question/);
  await expect(quiz.locator(".wos-game-round")).toHaveText("Round 1 of 4");
  await expect(quiz.locator(".wos-game-prompt")).toHaveText(
    "Which happy place?",
  );
  await expect(quiz.locator("img")).toHaveAttribute(
    "src",
    /images\/quiz-place-beach\.svg/,
  );
  await expect(quiz.locator(".wos-game-choice")).toHaveText([
    "beach",
    "park bench",
  ]);
  await expect(quiz.locator(".wos-game-memory")).toHaveCount(0);
  await expectBigAndTappable(page);
  await expectOneFrame(page);

  // A right answer keeps the G1/G2 reply and adds the family memory.
  await quiz.getByRole("button", { name: /^beach$/i }).click();
  await expect(quiz).toHaveAttribute("data-result", "right");
  await expect(quiz.locator(".wos-game-reply")).toHaveText(
    "Yes! That's the beach.",
  );
  await expect(quiz.locator(".wos-game-memory")).toHaveText(
    "We swam here every summer.",
  );
  expect((await quiz.innerText()).toLowerCase()).not.toContain("wrong");
  await expectBigAndTappable(page);
  await expectOneFrame(page);

  // A miss teaches the name; it never calls the answer wrong.
  await quiz.getByRole("button", { name: "Next", exact: true }).click();
  await expect(quiz.locator(".wos-game-round")).toHaveText("Round 2 of 4");
  await expect(quiz.locator("img")).toHaveAttribute(
    "src",
    /images\/quiz-place-bench\.svg/,
  );
  await quiz.getByRole("button", { name: /^old market$/i }).click();
  await expect(quiz).toHaveAttribute("data-result", "gentle");
  await expect(quiz.locator(".wos-game-reply")).toHaveText(
    "That's the park bench.",
  );
  await expect(quiz.locator(".wos-game-memory")).toHaveText(
    "We watched ducks here.",
  );
  expect((await quiz.innerText()).toLowerCase()).not.toContain("wrong");
  await expectBigAndTappable(page);
  await expectOneFrame(page);

  await quiz.getByRole("button", { name: "Next", exact: true }).click();
  await expect(quiz.locator("img")).toHaveAttribute(
    "src",
    /images\/quiz-place-market\.svg/,
  );
  await quiz.getByRole("button", { name: /^old market$/i }).click();
  await expect(quiz.locator(".wos-game-memory")).toHaveText(
    "We bought fresh fruit here.",
  );
  await quiz.getByRole("button", { name: "Next", exact: true }).click();
  await expect(quiz.locator("img")).toHaveAttribute(
    "src",
    /images\/quiz-place-kitchen\.svg/,
  );
  await quiz.getByRole("button", { name: /^family kitchen$/i }).click();
  await expect(quiz.locator(".wos-game-memory")).toHaveText(
    "We cooked together every Sunday.",
  );
  await quiz.getByRole("button", { name: "Next", exact: true }).click();

  await expect(quiz).toHaveClass(/wos-game-done/);
  await expect(quiz.locator(".wos-game-done-text")).toHaveText("Well done!");
  await expectBigAndTappable(page);
  await expectOneFrame(page);
  await quiz.getByRole("button", { name: "Back to home", exact: true }).click();
  await expect(
    watch.getByRole("button", { name: "Help me home", exact: true }),
  ).toBeVisible();
});

test("happy places fits the small stage with SOS still visible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 880, height: 700 });
  await openFresh(page);
  const watch = watchOf(page);
  await watch.getByRole("button", { name: "Game", exact: true }).click();
  await expectBigAndTappable(page);
  await expectOneFrame(page);
  await watch
    .getByRole("button", { name: "Happy places", exact: true })
    .click();
  await expectBigAndTappable(page);
  await expectOneFrame(page);

  const quiz = watch.locator(".wos-game");
  await quiz.getByRole("button", { name: /^beach$/i }).click();
  await expect(quiz.locator(".wos-game-memory")).toBeVisible();
  await expectBigAndTappable(page);
  await expectOneFrame(page);

  await page.locator(".sos-hold").first().click({ delay: 3300 });
  await expect(page.getByText("Help is coming. · Demo").first()).toBeVisible();
  await expect(watch.locator(".wos-game")).toHaveCount(0);
  await expectOneFrame(page);
});
