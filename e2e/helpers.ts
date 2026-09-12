import { expect, type Page, type Route } from "@playwright/test";
import {
  dataSources,
  notionFixtures,
  trading212HistoricalDividends,
  trading212HistoricalOrders,
  trading212Positions,
} from "./fixtures";

const passcode = "test-passcode";

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

export async function mockAppApis(
  page: Page,
  options: { authenticated?: boolean } = {}
) {
  let authenticated = options.authenticated ?? true;

  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;

    if (path === "/api/auth/verify") {
      if (request.method() === "POST") {
        const body = request.postDataJSON() as { passcode?: string };
        if (body.passcode === passcode) {
          authenticated = true;
          return json(route, { authenticated: true });
        }
        return json(route, { error: "Invalid passcode" }, 401);
      }

      return json(route, { authenticated });
    }

    if (path === "/api/notion/data-sources") {
      return json(route, { dataSources });
    }

    if (path === "/api/notion") {
      const source = url.searchParams.get("dataSource") ?? "Finance 2026";
      return json(route, notionFixtures[source] ?? notionFixtures["Finance 2026"]);
    }

    if (path === "/api/balance-calculation") {
      return json(route, { notionTarget: 17000.37, warnings: [] });
    }

    if (path === "/api/trading212") {
      return json(route, { data: trading212Positions });
    }

    if (path === "/api/trading212/historical_orders") {
      return json(route, { data: trading212HistoricalOrders });
    }

    if (path === "/api/trading212/historical_dividends") {
      return json(route, { data: trading212HistoricalDividends });
    }

    return route.fallback();
  });
}

export async function mockLoggedOut(page: Page) {
  await mockAppApis(page, { authenticated: false });
}

export async function authenticateByStorage(page: Page) {
  await page.addInitScript(() => {
    window.sessionStorage.setItem("dashboard_authenticated", "true");
  });
}

export async function loginWithPasscode(page: Page) {
  await page.getByPlaceholder("Enter passcode").fill(passcode);
  await page.getByRole("button", { name: "Access Dashboard" }).click();
  await expect(page.getByRole("heading", { name: "Personal Finance Dashboard" })).toBeVisible();
}
