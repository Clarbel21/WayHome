import { test, expect, type Page } from "@playwright/test";

// G4 — caregiver edits family and memory cards on the phone; the web watch
// uses the edited names, lines and photos immediately, with built-in fallback.

const PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
  "base64",
);

const watchOf = (page: Page) => page.locator(".watch-area .watch").first();
const phoneOf = (page: Page) => page.locator(".care-phone").first();

async function openFresh(page: Page) {
  await page.goto("/#/companion");
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();
  await watchOf(page).waitFor();
}

async function openEditor(page: Page) {
  const phone = phoneOf(page);
  await phone.getByRole("button", { name: "Care tools", exact: true }).click();
  await phone
    .locator(".phone-tool-list")
    .getByRole("button", { name: /Family & memories/ })
    .click();
  await expect(phone.locator(".cph-family")).toBeVisible();
  return phone;
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

test("a person edit persists and reaches Call and Faces on the watch", async ({
  page,
}) => {
  await openFresh(page);
  const phone = await openEditor(page);
  await expect(phone.locator(".cph-fm-row")).toHaveCount(3);

  const jamie = phone.locator(".cph-fm-row").filter({ hasText: "Jamie" }).first();
  await jamie.getByRole("button", { name: "Edit" }).click();
  await jamie.getByLabel("Name").fill("Jules");
  await jamie.getByLabel("Relation").fill("Oldest daughter");
  await jamie.getByLabel("Memory line").fill("We bake together.");
  await jamie.locator('input[type="file"]').setInputFiles({
    name: "jamie.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  await expect(phone.getByRole("alert")).toHaveCount(0);
  await jamie.getByRole("button", { name: "Save" }).click();
  await expect(
    phone.getByText("Saved. The watch uses it now."),
  ).toBeVisible();
  await expect(phone.locator(".cph-fm-row").first()).toContainText("Jules");

  await page.reload();
  const reloaded = await openEditor(page);
  await expect(reloaded.locator(".cph-fm-row").first()).toContainText("Jules");
  await expect(reloaded.locator(".cph-fm-row").first()).toContainText(
    "Oldest daughter",
  );

  const watch = watchOf(page);
  await watch.getByRole("button", { name: "Call family", exact: true }).click();
  const face = watch.locator(".wos-call-face").first();
  await expect(face).toContainText("Jules");
  await expect(face.locator("img")).toHaveAttribute("src", /^blob:/);
  await expect(watch.locator("input, textarea")).toHaveCount(0);
  await expectOneFrame(page);

  await page.reload();
  await watch.getByRole("button", { name: "Game", exact: true }).click();
  await watch.getByRole("button", { name: "Faces", exact: true }).click();
  const quiz = watch.locator(".wos-game");
  await expect(quiz.locator("img")).toHaveAttribute("src", /^blob:/);
  await expect(quiz.locator(".wos-game-choice")).toHaveText(["Jules", "Sam"]);
  await quiz.getByRole("button", { name: /^Jules$/i }).click();
  await expect(quiz.locator(".wos-game-memory")).toHaveText(
    "We bake together.",
  );
  await expectOneFrame(page);
  await quiz.getByRole("button", { name: "Back to home" }).click();
  await expect(
    watch.getByRole("button", { name: "Help me home", exact: true }),
  ).toBeVisible();
});

test("place edits persist and reach Places and Happy places on the watch", async ({
  page,
}) => {
  await openFresh(page);
  await page.setViewportSize({ width: 1280, height: 720 });
  const phone = await openEditor(page);
  await phone.getByRole("tab", { name: "Places" }).click();
  await expect(phone.locator(".cph-fm-row")).toHaveCount(8);

  const bakery = phone
    .locator(".cph-fm-row")
    .filter({ hasText: "bakery" })
    .first();
  await bakery.getByRole("button", { name: "Edit" }).click();
  await bakery.getByLabel("Memory line").fill("Muffins on Fridays.");
  await bakery.locator('input[type="file"]').setInputFiles({
    name: "bakery.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  await bakery.getByRole("button", { name: "Save" }).click();
  await expect(phone.getByText("Saved. The watch uses it now.")).toBeVisible();

  const beach = phone
    .locator(".cph-fm-row")
    .filter({ hasText: "beach" })
    .first();
  await beach.getByRole("button", { name: "Edit" }).click();
  await beach.getByLabel("Memory line").fill("Sunset swims.");
  await beach.locator('input[type="file"]').setInputFiles({
    name: "beach.png",
    mimeType: "image/png",
    buffer: PNG,
  });
  await beach.getByRole("button", { name: "Save" }).click();

  await page.reload();
  const reloaded = await openEditor(page);
  await reloaded.getByRole("tab", { name: "Places" }).click();
  await expect(
    reloaded.locator(".cph-fm-row").filter({ hasText: "bakery" }),
  ).toContainText("Muffins on Fridays.");
  await expect(
    reloaded.locator(".cph-fm-row").filter({ hasText: "beach" }),
  ).toContainText("Sunset swims.");

  const watch = watchOf(page);
  await watch.getByRole("button", { name: "Game", exact: true }).click();
  await watch.getByRole("button", { name: "Places", exact: true }).click();
  const quiz = watch.locator(".wos-game");
  await quiz.getByRole("button", { name: /^garden$/i }).click();
  await quiz.getByRole("button", { name: "Next" }).click();
  await expect(quiz.locator("img")).toHaveAttribute("src", /^blob:/);
  await quiz.getByRole("button", { name: /^bakery$/i }).click();
  await expect(quiz.locator(".wos-game-memory")).toHaveText(
    "Muffins on Fridays.",
  );
  await expectOneFrame(page);

  await quiz.getByRole("button", { name: "Back to home" }).click();
  await watch.getByRole("button", { name: "Game", exact: true }).click();
  await watch
    .getByRole("button", { name: "Happy places", exact: true })
    .click();
  await expect(quiz.locator("img")).toHaveAttribute("src", /^blob:/);
  await quiz.getByRole("button", { name: /^beach$/i }).click();
  await expect(quiz.locator(".wos-game-memory")).toHaveText("Sunset swims.");
  await expectOneFrame(page);
});

test("validation keeps rambling lines off the watch", async ({ page }) => {
  await openFresh(page);
  const phone = await openEditor(page);
  const jamie = phone.locator(".cph-fm-row").filter({ hasText: "Jamie" }).first();
  await jamie.getByRole("button", { name: "Edit" }).click();
  await jamie
    .getByLabel("Memory line")
    .fill("one two three four five six seven eight nine");
  await jamie.getByRole("button", { name: "Save" }).click();
  await expect(phone.getByRole("alert")).toContainText("1–8 short words");
  await expect(phone.locator(".cph-fm-row").first()).toContainText("Jamie");
  await expect(watchOf(page).locator(".wos-game")).toHaveCount(0);
});
