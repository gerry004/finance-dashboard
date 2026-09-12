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
  await expect(page.getByText("-€56.08")).toBeVisible();
  await expect(page.getByText("Saved Target")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Use live Notion balance" })
  ).toHaveCount(0);

  const cashInput = page.getByRole("textbox", { name: "Cash", exact: true });
  await cashInput.fill("200.12");
  await page.getByRole("textbox", { name: "Revolut - Cash" }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();

  await page.reload();
  await expect(cashInput).toHaveValue("200.12");
});
