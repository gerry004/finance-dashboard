import { expect, test } from "@playwright/test";
import { authenticateByStorage, mockAppApis } from "./helpers";

test.beforeEach(async ({ page }) => {
  await authenticateByStorage(page);
  await mockAppApis(page);
});

test("uses read-only Trading 212 values and persists manual values locally", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "finance-dashboard.balance-calculation.v1.trading212Cash",
      "99.99"
    );
    window.localStorage.setItem(
      "finance-dashboard.balance-calculation.v1.trading212InterestToday",
      "999.99"
    );
  });
  await page.goto("/balance-calculation");

  await expect(page.getByText("Live Notion Balance")).toBeVisible();
  await expect(page.getByText("€17,000.37")).toBeVisible();
  await expect(page.getByText("-€69.15")).toBeVisible();
  await expect(page.getByText("Saved Target")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Use live Notion balance" })
  ).toHaveCount(0);

  await expect(
    page.getByRole("textbox", { name: "Trading 212 - Cash" })
  ).toHaveCount(0);
  await expect(page.getByText("Live Trading 212 cash (EUR).")).toBeVisible();
  await expect(page.getByText("Live calendar-year total from Trading 212.")).toBeVisible();
  await expect(
    page.locator("#balance-input-trading212InterestToday")
  ).toHaveCount(0);
  await expect(page.getByText("€215.10").first()).toBeVisible();

  const legacyValues = await page.evaluate(() => ({
    cash: window.localStorage.getItem(
      "finance-dashboard.balance-calculation.v1.trading212Cash"
    ),
    interest: window.localStorage.getItem(
      "finance-dashboard.balance-calculation.v1.trading212InterestToday"
    ),
  }));
  expect(legacyValues).toEqual({ cash: null, interest: null });

  const cashInput = page.getByRole("textbox", { name: "Cash", exact: true });
  await cashInput.fill("200.12");
  await page.getByRole("textbox", { name: "Revolut - Cash" }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();

  await page.reload();
  await expect(cashInput).toHaveValue("200.12");

  const cashbackInput = page.getByRole("textbox", { name: "All Time" });
  await cashbackInput.fill("35.50");
  await page.getByRole("textbox", { name: "Pending" }).click();
  await expect(page.getByText("Saved", { exact: true }).first()).toBeVisible();

  await page.reload();
  await expect(cashbackInput).toHaveValue("35.50");
  await expect(
    page.getByRole("button", { name: "Use Trading 212 cash" })
  ).toHaveCount(0);
});

test("keeps the calculator usable when live interest is unavailable", async ({
  page,
}) => {
  await page.route("**/api/trading212/interest", (route) =>
    route.fulfill({
      status: 503,
      contentType: "application/json",
      body: JSON.stringify({ error: "Interest unavailable" }),
    })
  );

  await page.goto("/balance-calculation");

  await expect(page.getByText("Live Notion Balance")).toBeVisible();
  await expect(page.getByText("Live Trading 212 cash (EUR).")).toBeVisible();
  await expect(
    page.getByText("Trading 212 interest history is currently unavailable.")
  ).toBeVisible();
  await expect(
    page
      .getByRole("heading", { name: "Trading 212 - Interest on Cash" })
      .locator("..")
  ).toContainText("Unavailable");
  await expect(
    page.getByText("Calculated Actual").locator("..").getByText("Unavailable")
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "Cash", exact: true })
  ).toBeVisible();
});
