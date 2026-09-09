import { expect, test, type Page } from "@playwright/test";
import { authenticateByStorage, mockAppApis } from "./helpers";

async function expectVisibleText(page: Page, text: string) {
  await expect(page.getByText(text).first()).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await authenticateByStorage(page);
  await mockAppApis(page);
});

test("loads checking dashboard metrics and transaction rows", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Personal Finance Dashboard" })).toBeVisible();
  await expect(page.locator("#data-source-select")).toHaveValue("Finance 2026");
  await expectVisibleText(page, "€6200.00");
  await expectVisibleText(page, "€1400.00");
  await expectVisibleText(page, "€4800.00");
  await expectVisibleText(page, "€250.00");
  await expectVisibleText(page, "€4900.00");
  await expect(page.getByRole("cell", { name: "January Salary" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "February Salary" })).toBeVisible();
});

test("supports table sorting, date filters, tag filters, and data-source switching", async ({ page }) => {
  await page.goto("/");

  const transactionsTable = page.locator("table").last();
  await transactionsTable.getByRole("columnheader", { name: "Amount" }).click();
  await expect(transactionsTable.getByRole("columnheader", { name: "Amount ↑" })).toBeVisible();

  await page.getByRole("button", { name: /Date Range/ }).click();
  await page.locator('input[type="date"]').first().fill("2026-01-01");
  await page.locator('input[type="date"]').nth(1).fill("2026-01-31");
  await expect(page.getByRole("cell", { name: "February Salary" })).toHaveCount(0);
  await expectVisibleText(page, "€3000.00");
  await expectVisibleText(page, "€1400.00");

  await page.getByRole("button", { name: /Tag Filters/ }).click();
  await page.getByRole("button", { name: "Food ✓" }).click();
  await expect(page.getByRole("cell", { name: "January Groceries" })).toHaveCount(0);
  await expectVisibleText(page, "€1200.00");

  await page.locator("#data-source-select").selectOption("Side Account");
  await expect(page).toHaveURL(/dataSource=Side\+Account/);
  await expect(page.getByRole("cell", { name: "Side Refund" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "January Salary" })).toHaveCount(0);
  await expectVisibleText(page, "€75.00");
  await expectVisibleText(page, "€10.00");
});
