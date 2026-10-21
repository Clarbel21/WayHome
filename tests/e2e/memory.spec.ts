import { resolveIncident } from "./support";
import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
function recording() {
  const samples = 80000;
  const data = Buffer.alloc(44 + samples * 2);
  data.write("RIFF");
  data.writeUInt32LE(data.length - 8, 4);
  data.write("WAVEfmt ", 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(8000, 24);
  data.writeUInt32LE(16000, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write("data", 36);
  data.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++)
    data.writeInt16LE(
      Math.round(Math.sin((i / 8000) * 440 * 2 * Math.PI) * 1000),
      44 + i * 2,
    );
  return data;
}
const picture = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXxkAAAAASUVORK5CYII=",
  "base64",
);
async function openHome(
  page: import("@playwright/test").Page,
  preserve = false,
) {
  await page.goto("/#/memories");
  const begin = page.getByRole("button", { name: "Let's begin", exact: true });
  if (await begin.isVisible()) await begin.click();
  if (!preserve)
    await page
      .getByRole("button", { name: "Back to memories", exact: true })
      .click();
}

test("all five activities, gentle choices, progress persistence, and caregiver history", async ({
  page,
}) => {
  await page.goto("/#/companion");
  await page
    .getByRole("link", { name: "Explore Memories", exact: true })
    .click();
  await expect(
    page.getByText("Hi, I'm Sprout. Would you like to explore a memory?"),
  ).toBeVisible();
  await page.getByRole("button", { name: "Let's begin", exact: true }).click();
  await page
    .getByRole("button", { name: "Familiar Faces", exact: true })
    .click();
  await expect(page.getByText("Mei", { exact: true })).not.toBeVisible();
  await page.getByRole("button", { name: "Tell me more", exact: true }).click();
  await expect(page.getByText(/This is your daughter, Mei/)).toBeVisible();
  await expect(
    page.getByRole("img", { name: /has 1 keepsakes/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to my memories" }).click();
  await expect(
    page.getByRole("img", { name: /has 1 keepsakes/ }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "My Happy Places", exact: true })
    .click();
  await page.getByRole("button", { name: "Not sure", exact: true }).click();
  await expect(
    page.getByText("The neighborhood park", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to my memories" }).click();
  await page
    .getByRole("button", { name: "Music Memories", exact: true })
    .click();
  await expect(
    page.getByText(/No audio is attached. Nothing is playing/),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Play recording" }),
  ).not.toBeVisible();
  await page.getByRole("button", { name: "More feelings" }).click();
  await page.getByRole("button", { name: "Nostalgic", exact: true }).click();
  await page.getByRole("button", { name: "Back to my memories" }).click();
  await page.getByRole("button", { name: "More activities" }).click();
  await page
    .getByRole("button", { name: "Everyday Moments", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Take your keys", exact: true })
    .click();
  await page.reload();
  await expect(
    page.getByRole("listitem").filter({ hasText: "Take your keys" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Put on shoes", exact: true }).click();
  await page
    .getByRole("button", { name: "Go for a walk", exact: true })
    .click();
  await page.getByRole("button", { name: "This feels familiar" }).click();
  await expect(
    page.getByText("That’s your familiar rhythm. Thank you for sharing."),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back to my memories" }).click();
  await page.getByRole("button", { name: "More activities" }).click();
  await page
    .getByRole("button", { name: "Memory Garden", exact: true })
    .click();
  await page.getByRole("button", { name: "Plant a little tree" }).click();
  await expect(
    page.getByRole("img", { name: /has 5 keepsakes/ }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("img", { name: /has 5 keepsakes/ }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Exit memories", exact: true }).click();
  await page.goto("/#/caregiver/library");
  await expect(
    page.getByRole("heading", { name: "Shared moments", exact: true }),
  ).toBeVisible();
  await expect(
    page.locator(".memory-history li span").filter({ hasText: /^completed/ }),
  ).toHaveCount(5);
});

test("library approval, image/audio persistence, previews, edit/delete, metadata and complete backup", async ({
  page,
}) => {
  await page.goto("/#/caregiver/library");
  await page.getByRole("button", { name: "Add memory", exact: true }).click();
  await page.getByLabel("Person’s name").fill("Aunt June");
  await page.getByLabel("Relationship", { exact: true }).fill("aunt");
  await page
    .getByLabel("Personal memory description")
    .fill("We planted roses together.");
  await page.getByLabel(/Photograph/).setInputFiles({
    name: "june.png",
    mimeType: "image/png",
    buffer: picture,
  });
  await page.getByRole("button", { name: "Save memory", exact: true }).click();
  let card = page.locator(".memory-library-entry").filter({
    has: page.getByRole("heading", { name: "Aunt June", exact: true }),
  });
  await expect(card).toBeVisible();
  await page.reload();
  card = page.locator(".memory-library-entry").filter({
    has: page.getByRole("heading", { name: "Aunt June", exact: true }),
  });
  await expect(card.locator("img")).toHaveJSProperty("naturalWidth", 1);
  await card.getByRole("button", { name: "Preview", exact: true }).click();
  await expect(
    page.getByText(/Not approved — hidden from Companion Mode/),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tell me more", exact: true }).click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("heading", { name: "Aunt June", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close preview" }).click();
  // Revoke the built-in face: an unapproved uploaded face must not be selected either.
  await page
    .locator(".memory-library-entry")
    .filter({ has: page.getByRole("heading", { name: "Mei", exact: true }) })
    .getByRole("checkbox")
    .uncheck();
  await openHome(page);
  await page
    .getByRole("button", { name: "Familiar Faces", exact: true })
    .click();
  await expect(
    page.getByText(/No approved memories in this activity yet/),
  ).toBeVisible();
  await expect(page.getByText("Aunt June", { exact: true })).not.toBeVisible();
  await page.goto("/#/caregiver/library");
  await card.getByRole("checkbox").check();
  await card.getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByLabel("Person’s name").fill("Aunt Juniper");
  await page.getByRole("button", { name: "Save memory", exact: true }).click();
  await openHome(page);
  await page
    .getByRole("button", { name: "Familiar Faces", exact: true })
    .click();
  await expect(page.getByText(/Juniper/)).not.toBeVisible();
  await page.getByRole("button", { name: "Tell me more", exact: true }).click();
  await expect(page.getByText(/This is your aunt, Aunt Juniper/)).toBeVisible();
  await page.goto("/#/caregiver/library");
  await page.getByRole("button", { name: "Add memory", exact: true }).click();
  await page.getByLabel("Activity type").selectOption("music");
  await page.getByLabel("Song title").fill("Our original tune");
  await page.getByLabel("Artist", { exact: true }).fill("Test recording");
  await page.getByLabel(/Optional authorized audio/).setInputFiles({
    name: "original.wav",
    mimeType: "audio/wav",
    buffer: recording(),
  });
  await page.getByLabel("Approved for Companion Mode", { exact: true }).check();
  await page.getByRole("button", { name: "Save memory", exact: true }).click();
  await page
    .getByLabel("Enable optional music sound (still requires Play)")
    .check();
  await page
    .locator(".memory-library-entry")
    .filter({
      has: page.getByRole("heading", {
        name: "A song from a happy afternoon",
        exact: true,
      }),
    })
    .getByRole("checkbox")
    .uncheck();
  await openHome(page);
  await page
    .getByRole("button", { name: "Music Memories", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Play recording" }),
  ).toBeVisible();
  expect(
    await page
      .locator("audio")
      .evaluate((audio: HTMLAudioElement) => audio.paused),
  ).toBe(true);
  await page.getByRole("button", { name: "Play recording" }).click();
  await expect(
    page.getByRole("button", { name: "Pause recording" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Pause recording" }).click();
  await page.getByRole("button", { name: "Play recording" }).click();
  await page.evaluate(() => {
    (window as unknown as { lastAudio: HTMLAudioElement | null }).lastAudio =
      document.querySelector("audio");
  });
  await page.getByRole("button", { name: "SOS Hold for 2 seconds" }).focus();
  await page.keyboard.down("Space");
  await page.waitForTimeout(2100);
  await page.keyboard.up("Space");
  await expect(page.getByText("Help request sent — simulation")).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { lastAudio: HTMLAudioElement }).lastAudio.paused,
    ),
  ).toBe(true);
  await expect(page.locator("audio")).toHaveCount(0);
  await page.goto("/#/caregiver/emergency");
  await resolveIncident(page);
  await page.goto("/#/caregiver/library");
  let downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Back up with media" }).click();
  const backup = await downloadPromise;
  const path = await backup.path();
  const data = JSON.parse(await readFile(path!, "utf8"));
  expect(Object.keys(data.media)).toHaveLength(2);
  expect(
    await page.evaluate(() => localStorage.getItem("wayhome-memory-v1")),
  ).not.toContain("data:image");
  await page
    .getByRole("button", { name: "Delete memory Aunt Juniper" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Aunt Juniper", exact: true }),
  ).not.toBeVisible();
  await page.getByLabel("Import memory backup").setInputFiles(path!);
  await expect(
    page.getByText(/Imported 6 entries as new copies/),
  ).toBeVisible();
  const imported = page.locator(".memory-library-entry").filter({
    has: page.getByRole("heading", { name: "Aunt Juniper", exact: true }),
  });
  await expect(imported.locator("img")).toHaveJSProperty("naturalWidth", 1);
  downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export metadata JSON" }).click();
  const metadata = JSON.parse(
    await readFile((await (await downloadPromise).path())!, "utf8"),
  );
  expect(metadata.media).toEqual({});
});

test("cross-tab safety interrupts and preserves routine; renaming, skipping and preferences", async ({
  page,
  context,
}) => {
  await page.goto("/#/caregiver/settings");
  await page.getByLabel("Avatar name").fill("Buddy");
  await page.getByRole("button", { name: "Save companion name" }).click();
  await page.goto("/#/caregiver/library");
  await page.getByLabel("Preferred interaction duration").selectOption("short");
  await page
    .getByLabel("Reminder frequency (preference only)")
    .selectOption("weekly");
  await page
    .getByLabel("Music preferences", { exact: true })
    .fill("Gentle piano");
  await page.reload();
  await expect(
    page.getByLabel("Music preferences", { exact: true }),
  ).toHaveValue("Gentle piano");
  const wearer = await context.newPage();
  await openHome(wearer);
  await expect(
    wearer.getByText("What would you like to explore with Buddy?"),
  ).toBeVisible();
  await wearer.getByRole("button", { name: "More activities" }).click();
  await wearer
    .getByRole("button", { name: "Everyday Moments", exact: true })
    .click();
  await wearer
    .getByRole("button", { name: "Take your keys", exact: true })
    .click();
  await page.goto("/#/demo");
  await page.getByRole("button", { name: /Start Guided Return/ }).click();
  await expect(
    wearer.getByRole("heading", {
      name: "Memories can wait. We're here with you.",
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: /Trigger Simulated SOS/ }).click();
  await expect(
    wearer.getByText("Help request sent — simulation"),
  ).toBeVisible();
  await page.goto("/#/caregiver/alerts");
  await expect(
    page.getByText("Simulated SOS · help request received"),
  ).toBeVisible();
  await page.goto("/#/caregiver/emergency");
  await resolveIncident(page);
  await expect(
    wearer.getByRole("button", { name: "Resume activity" }),
  ).toBeVisible();
  await wearer.getByRole("button", { name: "Resume activity" }).click();
  await expect(
    wearer.getByRole("listitem").filter({ hasText: "Take your keys" }),
  ).toBeVisible();
  await wearer.getByRole("button", { name: /Skip this activity/ }).click();
  await expect(
    wearer.getByRole("img", { name: /has 0 keepsakes/ }),
  ).toBeVisible();
  await wearer
    .getByRole("link", { name: "Exit memories", exact: true })
    .click();
  await expect(
    wearer.getByRole("link", { name: "Explore Memories", exact: true }),
  ).toBeVisible();
});

test("sample presentation, mobile keyboard play, and immediate in-game SOS", async ({
  page,
}) => {
  await page.goto("/#/memory-demo");
  await page.getByRole("button", { name: "Prepare sample demo" }).click();
  for (let i = 0; i < 9; i++)
    await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByText("Help request sent — simulation")).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByText(/S5 stays active/)).toBeVisible();
  await page.goto("/#/caregiver/emergency");
  await resolveIncident(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await openHome(page, true);
  await page.getByRole("button", { name: "Resume activity" }).click();
  await page.getByRole("button", { name: "Tell me more", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText(/This is your daughter, Mei/)).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const sos = page.getByRole("button", { name: "SOS Hold for 2 seconds" });
  await sos.focus();
  await page.keyboard.down("Space");
  await page.waitForTimeout(2100);
  await page.keyboard.up("Space");
  await expect(page.getByText("Help request sent — simulation")).toBeVisible();
});
