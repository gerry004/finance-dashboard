import type { Metadata } from "next";
import { BalanceCalculatorPage } from "@/components/BalanceCalculatorPage";

export const metadata: Metadata = {
  title: "Balance Calculation | Finance Dashboard",
  description: "Reconcile real cash balances with the Notion checking balance.",
};

export default function BalanceCalculationPage() {
  return <BalanceCalculatorPage />;
}
