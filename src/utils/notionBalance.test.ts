import { describe, expect, it } from "vitest";
import { calculateNotionBalance } from "./notionBalance";

describe("calculateNotionBalance", () => {
  it("sums signed checking amounts and excludes creditors", () => {
    expect(
      calculateNotionBalance([
        { type: "Master", amount: 1000 },
        { type: "Income", amount: 250.5 },
        { type: "Expenditure", amount: -100.25 },
        { type: "Investment", amount: -300 },
        { type: "Investment", amount: 125 },
        { type: "Creditors", amount: 5000 },
        { type: null, amount: 25 },
      ])
    ).toBe(975.25);
  });
});
