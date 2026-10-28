import { test, expect, type Page } from "@playwright/test";

async function openPractice(page: Page) {
  await page.goto("/#/memories");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole("button", { name: "Let's begin" }).click();
  await page.getByRole("button", { name: "Practice my way home" }).click();
}

async function pickPhoto(page: Page, match: (src: string) => boolean) {
  const tiles = page.locator(".wp-photo-option");
  const n = await tiles.count();
  for (let i = 0; i < n; i++) {
    const src = (await tiles.nth(i).locator("img").getAttribute("src")) ?? "";
    if (match(src)) return tiles.nth(i).click();
  }
  throw new Error("no matching tile");
}

test("walkthrough shows each place with the turn the watch will give", async ({
  page,
}) => {
  await openPractice(page);
  await expect(
    page.getByRole("heading", { name: "Your walk home" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "See my walk" }).click();
  await expect(
    page.getByRole("heading", { name: "Community garden" }),
  ).toBeVisible();
  await expect(page.getByText(/green arch with flowers/)).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Turn right", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Turn left", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Home", exact: true }),
  ).toBeVisible();
});

test("errorless practice: a wrong pick shows the right place with its clue, then continues", async ({
  page,
}) => {
  await openPractice(page);
  await page.getByRole("button", { name: "Practice with me" }).click();
  await expect(
    page.getByRole("heading", { name: "Find the Community garden" }),
  ).toBeVisible();
  await pickPhoto(page, (src) => !src.includes("garden"));
  await expect(page.getByText("Tap the glowing one.")).toBeVisible();
  await expect(page.locator(".wp-photo-option.glow")).toHaveAccessibleName(
    "Community garden",
  );
  await page.locator(".wp-photo-option.glow").click();
  await expect(page.getByText("That's it.")).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "Find the Neighborhood bakery" }),
  ).toBeVisible();
  await pickPhoto(page, (src) => src.includes("bakery"));
  await expect(page.getByText("Yes!", { exact: true })).toBeVisible();

  await page.goto("/#/caregiver/landmarks");
  const card = page.getByRole("region", { name: "Landmark familiarity" });
  await expect(
    card.getByRole("listitem").filter({ hasText: "Community garden" }),
  ).toContainText("Still learning");
  await expect(
    card.getByRole("listitem").filter({ hasText: "Neighborhood bakery" }),
  ).toContainText("Getting familiar");
});

test("finishing a walk grows a flower and shows how familiar each place feels", async ({
  page,
}) => {
  await openPractice(page);
  await page.getByRole("button", { name: "Practice with me" }).click();
  for (let k = 0; k < 15; k++) {
    if (await page.locator(".wp-turns").count()) {
      const glow = page.locator(".wp-turn-option.glow");
      await page
        .getByRole("button", { name: "Straight on", exact: true })
        .click();
      if (await glow.count()) await glow.click();
    } else {
      const prompt = await page.locator("h1.wp-prompt").innerText();
      const order = ["garden", "bakery", "library", "home"];
      const after = /After the (.+?)\?/.exec(prompt)?.[1] ?? "";
      const named = order.find((o) => new RegExp(o, "i").test(after || prompt));
      const target = /first/.test(prompt)
        ? "garden"
        : after
          ? order[order.indexOf(named!) + 1]
          : named!;
      await pickPhoto(page, (src) => src.includes(target));
      if (await page.locator(".wp-photo-option.glow").count())
        await page.locator(".wp-photo-option.glow").click();
    }
    const finish = page.getByRole("button", { name: /^Finish/ });
    if (await finish.count()) {
      await finish.click();
      break;
    }
    await page.getByRole("button", { name: "Next", exact: true }).click();
  }
  await expect(
    page.getByRole("heading", { name: "Lovely walk!" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Done" }).click();
  await expect(
    page.getByRole("img", { name: /has 1 keepsakes/ }),
  ).toBeVisible();
});

test("returning visitors get the new sample memories", async ({ page }) => {
  await page.goto("/#/caregiver/library");
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem(
      "wayhome-memory-v1",
      JSON.stringify({
        state: {
          entries: [
            {
              id: "sample-mei",
              kind: "faces",
              title: "Mei",
              relationship: "daughter",
              description: "",
              artist: "",
              steps: [],
              approved: true,
              sample: true,
            },
          ],
          growth: [],
          history: [],
        },
        version: 1,
      }),
    );
  });
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Daniel", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Mei", exact: true }),
  ).toBeVisible();
});
