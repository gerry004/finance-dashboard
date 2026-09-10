import { expect, test, type Page } from "@playwright/test";
import { authenticateByStorage, mockAppApis } from "./helpers";

async function expectVisibleText(page: Page, text: string) {
  await expect(page.getByText(text).first()).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await authenticateByStorage(page);
  await mockAppApis(page);
});

test("loads investments metrics, open positions, closed positions, and orders", async ({ page }) => {
  await page.goto("/investments");

  await expect(page.getByRole("heading", { name: "Personal Finance Dashboard" })).toBeVisible();
  await expect(page.getByText("Total Portfolio Value")).toBeVisible();
  await expectVisibleText(page, "€150.00");
  await expect(page.getByText("Total Cost Basis")).toBeVisible();
  await expectVisibleText(page, "€100.00");
  await expect(page.getByText("Total Unrealized Profit/Loss")).toBeVisible();
  await expectVisibleText(page, "€50.00");
  await expectVisibleText(page, "€5.00");

  await expect(page.getByRole("heading", { name: "Open Positions" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "OPEN" }).first()).toBeVisible();
  await expectVisibleText(page, "+50.00%");

  await expect(page.getByRole("heading", { name: "Closed Positions" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "CLOSED" }).first()).toBeVisible();
  await expectVisibleText(page, "€3.00");

  await expect(page.getByRole("heading", { name: "Filled Orders" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "SELL" }).first()).toBeVisible();
  await expect(page.getByRole("cell", { name: "BUY" }).first()).toBeVisible();
});
