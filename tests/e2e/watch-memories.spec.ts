import { selectWatchActivity } from "./watch-helpers";
import { openWatchMemories } from "./watch-helpers";
import { test, expect } from "@playwright/test";

test("Memory Garden runs on the watch screen and steps aside for safety", async ({
  page,
  context,
}) => {
  await page.goto("/#/companion");
  const watch = page.locator(".watch-area .watch").first();
  await openWatchMemories(page);
  // Same page, inside the watch screen — no separate Memory Garden page.
  await expect(page).toHaveURL(/#\/companion$/);
  const screen = watch.locator(".wos-memories");
  await expect(screen).toBeVisible();

  await selectWatchActivity(page, "Music Memories");
  await expect(
    screen.getByText("The Moon Represents My Heart (月亮代表我的心)"),
  ).toBeVisible();
  await expect(screen.getByText("Teresa Teng · 1977")).toBeVisible();
  const find = screen.getByRole("link", {
    name: "Find song",
  });
  await expect(find).toHaveAttribute(
    "href",
    /youtube\.com\/results\?search_query=The%20Moon%20Represents%20My%20Heart/,
  );
  // SOS stays on the watch while memories are open.
  await expect(
    watch.getByRole("button", { name: "SOS Send help request" }),
  ).toBeVisible();
  // The open activity survives a reload.
  await page.reload();
  await expect(page.locator(".wos-memories")).toBeVisible();
  // A safety event takes over the watch.
  const care = await context.newPage();
  await care.goto("/#/demo");
  await care.getByRole("button", { name: /Start Guided Return/ }).click();
  await expect(page.locator(".wos-memories")).toHaveCount(0);
  await page.locator(".wos-more-options summary").click();
  await expect(
    page.getByRole("button", { name: "I know my way", exact: true }),
  ).toBeVisible();
});

test("Familiar Faces shows a realistic person first and can return to the watch home", async ({
  page,
}) => {
  await page.goto("/#/companion");
  await page
    .getByRole("button", { name: "Explore Memories", exact: true })
    .click();
  const screen = page.locator(".wos-memories");
  await screen.getByRole("button", { name: "Let's begin" }).click();
  await selectWatchActivity(page, "Familiar Faces");
  await expect(screen.locator('img[src*="memory-jamie"]')).toBeVisible();
  await screen.getByRole("button", { name: "Tell me more" }).click();
  await expect(screen.getByText(/This is your son, Jamie/)).toBeVisible();
  await screen.getByRole("button", { name: "Go back", exact: true }).click();
  await page
    .getByRole("button", { name: "Back to main screen", exact: true })
    .click();
  await expect(screen).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Say hello to Sprout", exact: true }),
  ).toBeVisible();
});
