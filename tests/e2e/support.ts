import { type Page, expect } from "@playwright/test";
export async function resolveIncident(page: Page) {
  await page
    .getByRole("button", { name: "Request incident resolution", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Verification required · S5 remains active",
    }),
  ).toBeVisible();
  await page
    .getByLabel("I have independently checked on the wearer in this simulation")
    .check();
  await page
    .getByRole("button", {
      name: "Verify resolution and close incident",
      exact: true,
    })
    .click();
  await expect(
    page.getByText(
      "Resolution verified and recorded. Device readings were preserved.",
    ),
  ).toBeVisible();
}
