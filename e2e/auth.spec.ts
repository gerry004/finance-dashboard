import { expect, test } from "@playwright/test";
import { loginWithPasscode, mockLoggedOut } from "./helpers";

test("requires passcode and handles invalid and valid attempts", async ({ page }) => {
  await mockLoggedOut(page);

  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Enter Passcode" })).toBeVisible();
  await page.getByPlaceholder("Enter passcode").fill("wrong-passcode");
  await page.getByRole("button", { name: "Access Dashboard" }).click();
  await expect(page.getByText("Invalid passcode")).toBeVisible();

  await loginWithPasscode(page);
  await expect(page.locator("#data-source-select")).toHaveValue("Finance 2026");
  await expect(page.evaluate(() => sessionStorage.getItem("dashboard_authenticated"))).resolves.toBe("true");
});
