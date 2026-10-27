import { test, expect, type Page } from "@playwright/test";
const errors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  errors.set(page, []);
  page.on("pageerror", (e) => errors.get(page)!.push(e.message));
});
test.afterEach(async ({ page }) => {
  expect(errors.get(page)).toEqual([]);
});
const picture = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXxkAAAAASUVORK5CYII=",
  "base64",
);
async function section(page: Page, value: string) {
  const names: Record<string, string> = {
    contacts: "Contacts",
    policy: "Safety policy",
    landmarks: "Familiar landmarks",
    library: "Memory Library",
    history: "Activity history",
    settings: "Settings",
  };
  await page.getByRole("button", { name: "Care tools", exact: true }).click();
  await page
    .locator(".phone-tool-list")
    .getByRole("button", { name: new RegExp(names[value]) })
    .click();
}

test("phone contacts validate, persist, reorder, protect required caregiver and restore focus on Cancel/Escape", async ({
  page,
}) => {
  await page.goto("/#/together");
  await section(page, "contacts");
  await page.getByRole("button", { name: "Add contact", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "Add caregiver contact",
    exact: true,
  });
  await dialog.getByLabel("Name", { exact: true }).fill("Fictional Robin");
  await dialog.getByLabel("Phone number", { exact: true }).fill("123");
  await dialog
    .getByRole("button", { name: "Save contact", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toContainText("8–15");
  await dialog
    .getByLabel("Phone number", { exact: true })
    .fill("(202) 555-0115");
  await dialog.getByLabel("Optional profile photograph").setInputFiles({
    name: "contact.png",
    mimeType: "image/png",
    buffer: picture,
  });
  await dialog
    .getByRole("button", { name: "Save contact", exact: true })
    .click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByText("Family · +12025550115", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await section(page, "contacts");
  await expect(
    page.getByRole("img", { name: "Fictional Robin's profile", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Move Fictional Robin earlier", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Delete Jamie Chen", exact: true })
    .click();
  await expect(
    page.getByRole("status").filter({ hasText: "final required caregiver" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Edit Fictional Robin", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Cancel contact", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Edit Fictional Robin", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Add contact", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Add contact", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "Delete Fictional Robin", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Fictional Robin", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Back to phone overview", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Send a check-in", exact: true }),
  ).toBeVisible();
});

test("phone landmark upload and metadata approvals stay separate; cancel and Close Library restore phone", async ({
  page,
}) => {
  await page.goto("/#/together");
  await section(page, "landmarks");
  await page.getByRole("button", { name: "Add landmark", exact: true }).click();
  const editor = page.getByRole("dialog", {
    name: "Add a familiar place",
    exact: true,
  });
  await editor.getByLabel("Name", { exact: true }).fill("Fictional pharmacy");
  await editor
    .getByLabel("Simple navigation instruction")
    .fill("Walk toward the pharmacy with the large green cross.");
  await editor
    .getByLabel("Recognition description")
    .fill("A large green cross above the doorway.");
  await editor
    .getByLabel("Spoken guidance cue")
    .fill("Look for the green cross.");
  await editor.getByLabel("Upload landmark photograph").setInputFiles({
    name: "landmark.png",
    mimeType: "image/png",
    buffer: picture,
  });
  await editor.getByLabel("Grid position (0–6)").fill("3");
  await editor.getByLabel("Visibility", { exact: true }).selectOption("day");
  await editor
    .getByLabel("Approve separately for Memory Garden", { exact: true })
    .check();
  await editor
    .getByRole("button", { name: "Save landmark", exact: true })
    .click();
  const card = page.locator(".landmark-card").filter({
    has: page.getByRole("heading", {
      name: "Fictional pharmacy",
      exact: true,
    }),
  });
  await expect(card.getByLabel("Show during guided return")).not.toBeChecked();
  await expect(
    card.getByLabel("Separately approve for Memory Garden"),
  ).toBeChecked();
  await card.getByLabel("Show during guided return").check();
  await card
    .getByRole("button", { name: "Edit landmark", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await expect(
    card.getByRole("button", { name: "Edit landmark", exact: true }),
  ).toBeFocused();
  await section(page, "library");
  await expect(
    page.getByRole("heading", { name: "Fictional pharmacy", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Close Memory Library", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Send a check-in", exact: true }),
  ).toBeVisible();
});

test("okay offers next actions, memory root Back/Exit restore wearer and guidance can cancel with low confidence", async ({
  page,
  context,
}) => {
  await page.goto("/#/together");
  await page
    .getByRole("button", { name: "Send a check-in", exact: true })
    .click();
  await page.getByRole("button", { name: "I'm okay", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Open Memory Garden", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Return to wearable home", exact: true })
    .click();
  await page.getByRole("button", { name: "Talk", exact: true }).click();
  await page
    .getByRole("button", { name: "Something comforting", exact: true })
    .click();
  await expect(
    page.getByText("Take your time. You are welcome here, just as you are.", {
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Back to wearable home", exact: true })
    .click();
  await page.getByRole("link", { name: "Memories", exact: true }).click();
  await page
    .getByRole("link", { name: "Back to wearable", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/together$/);
  await page
    .getByRole("link", { name: "Explore Memories", exact: true })
    .click();
  await page.getByRole("link", { name: "Exit memories", exact: true }).click();
  await expect(page).toHaveURL(/#\/together$/);
  await page.getByRole("button", { name: "Go home", exact: true }).click();
  const care = await context.newPage();
  await care.goto("/#/demo");
  await care
    .getByRole("button", { name: "Simulate low GPS confidence", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Cancel guidance", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Cancel guidance", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Cancel guidance", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText(
      "Guidance cancelled. Your caregiver can help with any remaining concern.",
      { exact: true },
    ),
  ).toBeVisible();
});

test("policy, optional journey, navigation roots and walkthrough exits work without a backend", async ({
  page,
}) => {
  await page.goto("/#/together");
  await section(page, "policy");
  await page.getByLabel("Repeated check-in delay (seconds)").fill("12");
  await page
    .getByLabel("Approve emergency escalation for explicit fall simulation")
    .check();
  await page.reload();
  await section(page, "policy");
  await expect(
    page.getByLabel("Repeated check-in delay (seconds)"),
  ).toHaveValue("12");
  await expect(
    page.getByLabel(
      "Approve emergency escalation for explicit fall simulation",
    ),
  ).toBeChecked();
  await section(page, "library");
  await page
    .getByLabel("Journey title", { exact: true })
    .fill("A gentle afternoon");
  await page
    .getByLabel("Familiar person / story", { exact: true })
    .selectOption("sample-mei");
  await page
    .getByLabel("Related place", { exact: true })
    .selectOption("sample-park");
  await page.getByRole("button", { name: "Save journey", exact: true }).click();
  await page
    .getByRole("button", { name: "Close Memory Library", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Explore Memories", exact: true })
    .click();
  await page.getByRole("button", { name: "Let's begin", exact: true }).click();
  await page
    .getByRole("link", { name: "A gentle afternoon", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Skip this memory", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Back one memory", exact: true })
    .click();
  await page.getByRole("link", { name: "Exit journey", exact: true }).click();
  await expect(page).toHaveURL(/#\/companion$/);
  await page.goto("/#/guided");
  await page.getByRole("button", { name: "Begin story", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page
    .getByRole("link", { name: "Exit walkthrough", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/companion$/);
  const data = await page.evaluate(
    () => JSON.parse(localStorage.getItem("wayhome-v1")!).state,
  );
  expect(data.checkIn?.deadline).toBeNull();
  await page.goto("/#/memory-demo");
  await page
    .getByRole("link", { name: "Exit walkthrough", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/companion$/);
});

for (const [width, height] of [
  [1280, 720],
  [1366, 768],
  [1440, 900],
  [1920, 1080],
])
  test(`viewport ${width}x${height} fits both devices and controls`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.goto("/#/together");
    async function fits() {
      const boxes = await page.evaluate(() => {
        const r = (q: string) => {
          const b = document.querySelector(q)!.getBoundingClientRect();
          return { top: b.top, bottom: b.bottom, left: b.left, right: b.right };
        };
        return {
          page: document.documentElement.scrollHeight,
          phone: r(".care-phone"),
          watch: r(".watch"),
          sos: r(".sos-hold"),
          toolbar: r(".stage-toolbar"),
        };
      });
      expect(boxes.page).toBeLessThanOrEqual(height + 1);
      expect(boxes.phone.bottom).toBeLessThanOrEqual(height);
      expect(boxes.watch.bottom).toBeLessThanOrEqual(boxes.toolbar.top + 1);
      expect(boxes.sos.bottom).toBeLessThanOrEqual(boxes.toolbar.top + 1);
      expect(boxes.watch.right).toBeLessThan(boxes.phone.left);
    }
    await fits();
    await page
      .getByRole("button", { name: "Send a check-in", exact: true })
      .click();
    await page.getByRole("button", { name: "I'm okay", exact: true }).click();
    await fits();
    await page
      .getByRole("button", { name: "Return to wearable home", exact: true })
      .click();
    await page.getByRole("button", { name: "Go home", exact: true }).click();
    await fits();
    await page
      .getByRole("button", { name: "Cancel guidance", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Send a check-in", exact: true })
      .click();
    await page
      .getByRole("button", { name: "I need help", exact: true })
      .click();
    await fits();
  });

test("mobile and 200% equivalent reflow preserve both interfaces and keyboard dialog access", async ({
  page,
}) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 640, height: 360 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/#/together");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("region", { name: "A little closer.", exact: true }),
    ).toBeVisible();
    await section(page, "contacts");
    await page
      .getByRole("button", { name: "Add contact", exact: true })
      .focus();
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("dialog", { name: "Add caregiver contact", exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(
      page.getByRole("button", { name: "Add contact", exact: true }),
    ).toBeFocused();
  }
});

test("standalone library close and Maybe later return to their parent interface", async ({
  page,
}) => {
  await page.goto("/#/caregiver/library");
  await page
    .getByRole("link", { name: "Close Memory Library", exact: true })
    .click();
  await expect(page).toHaveURL(/#\/together$/);
  await page
    .getByRole("link", { name: "Explore Memories", exact: true })
    .click();
  await page.getByRole("link", { name: "Maybe later", exact: true }).click();
  await expect(page).toHaveURL(/#\/together$/);
});
