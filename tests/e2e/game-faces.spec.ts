import { test, expect, type Page } from "@playwright/test";

// G2 — Familiar faces on the web watch. Same PhotoQuiz shell as G1, fed by
// the family list in src/store.ts. Four rounds, two big names, gentle reply.

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

async function openFaces(page: Page) {
  const watch = watchOf(page);
  await watch.getByRole("button", { name: "Game", exact: true }).click();
  await expect(watch.locator(".wos-game-pick")).toBeVisible();
  await watch.getByRole("button", { name: "Faces", exact: true }).click();
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
      title: px(".wos-game-pick-title"),
      round: px(".wos-game-round"),
      prompt: px(".wos-game-prompt"),
      result: px(".wos-game-result"),
      done: px(".wos-game-done-text"),
      buttons,
    };
  });
  for (const size of [
    sizes.title,
    sizes.round,
    sizes.prompt,
    sizes.result,
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
}

test("four face rounds use family names, two big choices and gentle words", async ({
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
  await picker.getByRole("button", { name: "Back to home" }).click();
  await expect(
    watch.getByRole("button", { name: "Help me home", exact: true }),
  ).toBeVisible();

  await openFaces(page);
  const quiz = watch.locator(".wos-game");
  await expect(quiz).toHaveClass(/wos-game-question/);
  await expect(quiz.locator(".wos-game-round")).toHaveText("Round 1 of 4");
  await expect(quiz.locator(".wos-game-prompt")).toHaveText("Who is this?");
  await expect(quiz.locator("img")).toHaveCount(1);
  await expect(quiz.locator("img")).toHaveAttribute(
    "src",
    /images\/quiz-face-jamie\.svg/,
  );
  await expect(quiz.locator(".wos-game-choice")).toHaveText(["Jamie", "Sam"]);
  await expectBigAndTappable(page);
  await expectOneFrame(page);
  const photo = (await quiz.locator("img").boundingBox())!;
  const choice = (await quiz
    .locator(".wos-game-choice")
    .first()
    .boundingBox())!;
  expect(photo.height).toBeGreaterThan(choice.height);

  // Round 1: right answer stays cheerful.
  await quiz.getByRole("button", { name: "Jamie", exact: true }).click();
  await expect(quiz).toHaveAttribute("data-result", "right");
  await expect(quiz.locator(".wos-game-result")).toHaveText(
    "Yes! That's Jamie.",
  );
  expect((await quiz.innerText()).toLowerCase()).not.toContain("wrong");

  // Round 2: a miss teaches the name; it never calls the answer wrong.
  await quiz.getByRole("button", { name: "Next", exact: true }).click();
  await expect(quiz.locator(".wos-game-round")).toHaveText("Round 2 of 4");
  await expect(quiz.locator("img")).toHaveAttribute(
    "src",
    /images\/quiz-face-sam\.svg/,
  );
  await quiz.getByRole("button", { name: "Mei", exact: true }).click();
  await expect(quiz).toHaveAttribute("data-result", "gentle");
  await expect(quiz.locator(".wos-game-result")).toHaveText(
    "That's Sam. Next one?",
  );
  expect((await quiz.innerText()).toLowerCase()).not.toContain("wrong");
  await expectBigAndTappable(page);
  await expectOneFrame(page);

  // Round 3: Mei, and the repeat round 4 pairs Jamie with a different face.
  await quiz.getByRole("button", { name: "Next", exact: true }).click();
  await expect(quiz.locator("img")).toHaveAttribute(
    "src",
    /images\/quiz-face-mei\.svg/,
  );
  await quiz.getByRole("button", { name: "Mei", exact: true }).click();
  await expect(quiz.locator(".wos-game-result")).toHaveText("Yes! That's Mei.");
  await quiz.getByRole("button", { name: "Next", exact: true }).click();
  await expect(quiz.locator(".wos-game-round")).toHaveText("Round 4 of 4");
  await expect(quiz.locator("img")).toHaveAttribute(
    "src",
    /images\/quiz-face-jamie\.svg/,
  );
  await expect(quiz.locator(".wos-game-choice")).toHaveText(["Mei", "Jamie"]);
  await quiz.getByRole("button", { name: "Mei", exact: true }).click();
  await expect(quiz.locator(".wos-game-result")).toHaveText(
    "That's Jamie. Next one?",
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
  await expect(watch.locator(".wos-game")).toHaveCount(0);
});

test("faces quiz fits the small stage and safety takes over mid-round", async ({
  page,
}) => {
  await page.setViewportSize({ width: 880, height: 700 });
  await openFresh(page);
  const watch = watchOf(page);
  await watch.getByRole("button", { name: "Game", exact: true }).click();
  await expectBigAndTappable(page);
  await expectOneFrame(page);
  await watch.getByRole("button", { name: "Faces", exact: true }).click();
  await expectBigAndTappable(page);
  await expectOneFrame(page);

  await page.locator(".sos-hold").first().click({ delay: 3300 });
  await expect(page.getByText("Help is coming. · Demo").first()).toBeVisible();
  await expect(watch.locator(".wos-game")).toHaveCount(0);
  await expectOneFrame(page);
});
