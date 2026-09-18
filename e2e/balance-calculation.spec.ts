import { expect, test } from "@playwright/test";
import { authenticateByStorage, mockAppApis } from "./helpers";

test.beforeEach(async ({ page }) => {
  await authenticateByStorage(page);
  await mockAppApis(page);
});

test("uses the live Notion balance and persists editable values locally", async ({
  page,
}) => {
  await page.goto("/balance-calculation");

  await expect(page.getByText("Live Notion Balance")).toBeVisible();
  await expect(page.getByText("€17,000.37")).toBeVisible();
  await expect(page.getByText("-€69.15")).toBeVisible();
  await expect(page.getByText("Saved Target")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Use live Notion balance" })
  ).toHaveCount(0);

  const trading212CashInput = page.getByRole("textbox", {
    name: "Trading 212 - Cash",
  });
  await expect(trading212CashInput).toHaveValue("16080.00");
  await expect(page.getByText("Using live Trading 212 cash")).toBeVisible();

  const cashInput = page.getByRole("textbox", { name: "Cash", exact: true });
  await cashInput.fill("200.12");
  await page.getByRole("textbox", { name: "Revolut - Cash" }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();

  await page.reload();
  await expect(cashInput).toHaveValue("200.12");

  await trading212CashInput.fill("99.99");
  await page.getByRole("textbox", { name: "Revolut - Cash" }).click();
  await expect(page.getByText("Manual value saved.")).toBeVisible();

  await page.reload();
  await expect(trading212CashInput).toHaveValue("99.99");
  await page.getByRole("button", { name: "Use Trading 212 cash" }).click();
  await expect(trading212CashInput).toHaveValue("16080.00");

  await page.reload();
  await expect(trading212CashInput).toHaveValue("16080.00");
});
