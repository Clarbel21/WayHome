import { expect, test, type Locator, type Page } from "@playwright/test";
import { installFakeSpeech, sayToMomo } from "./helpers/fakeSpeech";

type Step = {
  name: string;
  enter: (page: Page) => Promise<void>;
  ready: (page: Page) => Locator;
};

const watch = (page: Page) => page.locator(".watch-area .watch").first();
const phone = (page: Page) => page.locator(".care-phone").first();
const button = (page: Page, name: string) =>
  watch(page).getByRole("button", { name, exact: true });
const watchText = (page: Page, text: string) =>
  watch(page).getByText(text, { exact: true });
const home = (page: Page) => watch(page).locator(".wos-emoji-grid");
const press = (name: string) => (page: Page) => button(page, name).click();
const show = (text: string) => (page: Page) => watchText(page, text);
const hear = (text: string) => (page: Page) => sayToMomo(page, text);
const incoming = (page: Page) =>
  phone(page).getByRole("region", { name: "Incoming call" });
async function dismissPhonePopups(page: Page) {
  const dismiss = phone(page).getByRole("button", {
    name: "Dismiss notification",
  });
  while (await dismiss.first().isVisible()) await dismiss.first().click();
}
const respond = (name: "Answer" | "Decline") => async (page: Page) => {
  await dismissPhonePopups(page);
  await incoming(page).getByRole("button", { name, exact: true }).click();
};

const stops = [
  "Community garden",
  "Neighborhood bakery",
  "Local library",
  "Home",
];
const guide: Step[] = [
  ...stops.map((stop, index) => ({
    name: stop,
    enter: press(index === 0 ? "Help me home" : "I see it"),
    ready: (page: Page) =>
      watch(page).getByRole("img", { name: stop, exact: true }),
  })),
  { name: "arrival", enter: press("I see it"), ready: show("Welcome home.") },
];
const missed: Step = {
  name: "missed landmark",
  enter: press("Not yet"),
  ready: (page) => button(page, "See it now"),
};
const call: Step[] = [
  {
    name: "face picker",
    enter: press("Call family"),
    ready: show("Who to call?"),
  },
  {
    name: "ringing Sam",
    enter: press("Call family: Sam"),
    ready: (page) =>
      incoming(page).getByText("Alex is calling Sam", { exact: true }),
  },
  {
    name: "declined",
    enter: respond("Decline"),
    ready: show("No answer · Demo"),
  },
  {
    name: "ringing Mei",
    enter: press("Try Mei"),
    ready: (page) =>
      incoming(page).getByText("Alex is calling Mei", { exact: true }),
  },
  {
    name: "answered",
    enter: respond("Answer"),
    ready: show("Mei replied · Demo"),
  },
  {
    name: "acknowledgment",
    enter: press("I'm ready"),
    ready: show("I'm here with you."),
  },
];
const talk: Step[] = [
  {
    name: "opening question",
    enter: press("Let's talk"),
    ready: show("Hi! Want to chat with me?"),
  },
  {
    name: "location reply",
    enter: hear("where am I"),
    ready: show("Near home · Demo"),
  },
  {
    name: "home confirmation",
    enter: hear("take me home"),
    ready: show("Okay, let's go home."),
  },
  {
    name: "voice-started guidance",
    enter: (page) => page.clock.runFor(1200),
    ready: guide[0].ready,
  },
];
const gamePicker: Step = {
  name: "game picker",
  enter: press("Game"),
  ready: show("Which game?"),
};
const decks = [
  { name: "Places", answers: ["garden", "bakery", "library", "home"] },
  { name: "Faces", answers: ["Jamie", "Sam", "Mei", "Jamie"] },
  {
    name: "Happy places",
    answers: ["beach", "park bench", "old market", "family kitchen"],
  },
].map(({ name, answers }) => ({
  name,
  steps: [
    ...answers.flatMap((answer, index): Step[] => [
      {
        name: `round ${index + 1} question`,
        enter: press(index === 0 ? name : "Next"),
        ready: (page) =>
          watch(page)
            .locator(".wos-game-question")
            .getByText(`Round ${index + 1} of ${answers.length}`, {
              exact: true,
            }),
      },
      {
        name: `round ${index + 1} answer`,
        enter: press(answer),
        ready: (page) =>
          watch(page).locator('.wos-game-feedback[data-result="right"]'),
      },
    ]),
    { name: "finished", enter: press("Next"), ready: show("Well done!") },
  ],
}));

async function visit(page: Page, steps: Step[]) {
  for (const step of steps) {
    await test.step(step.name, async () => {
      await step.enter(page);
      await expect(step.ready(page)).toBeVisible();
    });
  }
}

test.use({ reducedMotion: "reduce" });
test.describe.configure({ mode: "parallel" });

test.beforeEach(async ({ page }) => {
  await installFakeSpeech(page);
  const now = Date.now();
  await page.clock.install({ time: now });
  await page.clock.pauseAt(now + 1000);
  await page.goto("/#/together");
  await expect(home(page)).toBeVisible();
});

test("Home confirms all four landmarks, arrives and returns home", async ({
  page,
}) => {
  await visit(page, guide);
  await press("Back")(page);
  await expect(home(page)).toBeVisible();

  // Reading a completed walk's updates must not reopen its ending.
  await phone(page)
    .getByRole("button", { name: "Updates", exact: true })
    .click();
  await dismissPhonePopups(page);
  await phone(page)
    .getByRole("button", { name: "Mark all read", exact: true })
    .click();
  await expect(home(page)).toBeVisible();

  await visit(page, guide);
  await press("Back")(page);
  await expect(home(page)).toBeVisible();
});

test("Home resumes after Not yet and I know my way exits the walk", async ({
  page,
}) => {
  await visit(page, [...guide.slice(0, 2), missed]);
  await press("See it now")(page);
  await expect(guide[2].ready(page)).toBeVisible();
  await press("I know my way")(page);
  await expect(home(page)).toBeVisible();

  await visit(page, [guide[0], missed]);
  await press("End guidance")(page);
  await expect(home(page)).toBeVisible();
});

test("Call picks, declines, tries next, answers and returns home", async ({
  page,
}) => {
  await visit(page, call.slice(0, 1));
  await press("Back")(page);
  await expect(home(page)).toBeVisible();
  await visit(page, call);
  await press("Maybe later")(page);
  await expect(home(page)).toBeVisible();
});

test("Talk answers, hands over to Home, and returns on Back or silence", async ({
  page,
}) => {
  await visit(page, talk);
  await press("I know my way")(page);
  await expect(home(page)).toBeVisible();
  await visit(page, talk.slice(0, 2));
  await press("Back")(page);
  await expect(home(page)).toBeVisible();
  await visit(page, talk.slice(0, 1));
  await page.clock.runFor(6999);
  await expect(talk[0].ready(page)).toBeVisible();
  // First quiet spell: one gentle check, still on Talk.
  await page.clock.runFor(1);
  await expect(show("Are you still there?")(page)).toBeVisible();
  // Second quiet spell: back home.
  await page.clock.runFor(7000);
  await expect(home(page)).toBeVisible();
});

test("Talk Back cancels the previous voice handover", async ({ page }) => {
  await visit(page, talk.slice(0, 3));
  await page.clock.runFor(300);
  await press("Back")(page);
  await expect(home(page)).toBeVisible();

  await visit(page, talk.slice(0, 3));
  await page.clock.runFor(900);
  await expect(talk[2].ready(page)).toBeVisible();
  await page.clock.runFor(300);
  await expect(guide[0].ready(page)).toBeVisible();
});

for (const deck of decks) {
  test(`Game finishes ${deck.name} and returns home`, async ({ page }) => {
    await visit(page, [gamePicker, ...deck.steps]);
    await press("Back to home")(page);
    await expect(home(page)).toBeVisible();
  });
}

async function checkSOS(page: Page, ready: (page: Page) => Locator) {
  const sos = button(page, "SOS Hold for 3 seconds");
  const emergency = watchText(page, "Help is coming. · Demo");
  await sos.click();
  await page.clock.runFor(150);
  await expect(emergency).toHaveCount(0);
  await expect(ready(page)).toBeVisible();

  await sos.hover();
  await page.mouse.down();
  try {
    await page.clock.runFor(2999);
    await expect(emergency).toHaveCount(0);
    await page.clock.runFor(1);
    await expect(emergency).toBeVisible();
  } finally {
    await page.mouse.up();
  }
  await expect(emergency).toBeVisible();
}

test("SOS from the four-tile home", async ({ page }) => {
  await checkSOS(page, home);
});

const lanes = [
  { name: "Home", steps: guide },
  { name: "Home missed landmark", steps: [guide[0], missed], from: 1 },
  { name: "Call", steps: call },
  { name: "Talk", steps: talk },
  { name: "Game picker", steps: [gamePicker] },
  ...decks.map(({ name, steps }) => ({
    name: `Game ${name}`,
    steps: [gamePicker, ...steps],
    from: 1,
  })),
];

for (const lane of lanes) {
  for (const [index, step] of lane.steps.entries()) {
    if (index < (lane.from ?? 0)) continue;
    test(`SOS from ${lane.name}: ${step.name}`, async ({ page }) => {
      await visit(page, lane.steps.slice(0, index + 1));
      // Talk's confirmation normally becomes guidance after 1.2 s. Hold
      // through that transition and still give SOS the full three seconds.
      await checkSOS(page, step.ready);
    });
  }
}
