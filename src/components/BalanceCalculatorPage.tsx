"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { DashboardNav } from "@/components/DashboardNav";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { PasscodePrompt } from "@/components/PasscodePrompt";
import {
  BALANCE_INPUT_KEYS,
  type BalanceCalculationResponse,
  type BalanceInputKey,
  type BalanceInputs,
  type BalancePatchResponse,
} from "@/types/balanceCalculation";
import {
  calculateBalance,
  eurosToCents,
  parseEuroInput,
} from "@/utils/balanceCalculation";
import { handleUnauthorized } from "@/utils/authHelpers";

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface FieldSaveState {
  status: SaveStatus;
  message?: string;
}

interface EditableAmountRowProps {
  field: BalanceInputKey;
  label: string;
  value: string;
  saveState: FieldSaveState;
  onChange: (field: BalanceInputKey, value: string) => void;
  onSave: (field: BalanceInputKey) => void;
}

interface ReadOnlyAmountRowProps {
  label: string;
  value: number;
  emphasized?: boolean;
}

const euroFormatter = new Intl.NumberFormat("en-IE", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatEuro(value: number): string {
  return euroFormatter.format(eurosToCents(value) / 100);
}

function formatInput(value: number): string {
  return (eurosToCents(value) / 100).toFixed(2);
}

function createInputValues(inputs: BalanceInputs): Record<BalanceInputKey, string> {
  return Object.fromEntries(
    BALANCE_INPUT_KEYS.map((key) => [key, formatInput(inputs[key])])
  ) as Record<BalanceInputKey, string>;
}

function createSaveStates(): Record<BalanceInputKey, FieldSaveState> {
  return Object.fromEntries(
    BALANCE_INPUT_KEYS.map((key) => [key, { status: "idle" }])
  ) as Record<BalanceInputKey, FieldSaveState>;
}

function EditableAmountRow({
  field,
  label,
  value,
  saveState,
  onChange,
  onSave,
}: EditableAmountRowProps) {
  const inputId = `balance-input-${field}`;

  return (
    <div className="grid min-h-20 grid-cols-[minmax(0,1fr)_minmax(8.5rem,11rem)] items-center gap-4 border-t border-blue-200 bg-[#d7e8f7] px-4 py-3 first:border-t-0">
      <label htmlFor={inputId} className="min-w-0 text-sm font-medium text-gray-800">
        {label}
      </label>
      <div className="min-w-0">
        <div className="flex items-center rounded border border-blue-300 bg-white px-2 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-200">
          <span aria-hidden="true" className="text-sm text-gray-500">
            €
          </span>
          <input
            id={inputId}
            type="text"
            inputMode="decimal"
            value={value}
            onChange={(event) => onChange(field, event.target.value)}
            onBlur={() => onSave(field)}
            disabled={saveState.status === "saving"}
            aria-invalid={saveState.status === "error"}
            className="min-w-0 flex-1 bg-transparent px-2 py-2 text-right font-semibold tabular-nums text-gray-950 outline-none disabled:cursor-wait"
          />
        </div>
        <div
          aria-live="polite"
          className={`mt-1 h-4 text-right text-xs ${
            saveState.status === "error" ? "text-red-700" : "text-gray-500"
          }`}
        >
          {saveState.status === "saving" ? "Saving..." : null}
          {saveState.status === "saved" ? "Saved" : null}
          {saveState.status === "error" ? (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSave(field)}
              className="font-semibold underline underline-offset-2"
            >
              {saveState.message} - retry
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ReadOnlyAmountRow({
  label,
  value,
  emphasized = false,
}: ReadOnlyAmountRowProps) {
  return (
    <div
      className={`grid min-h-14 grid-cols-[minmax(0,1fr)_minmax(8.5rem,11rem)] items-center gap-4 border-t border-gray-200 px-4 py-3 first:border-t-0 ${
        emphasized ? "bg-gray-100 font-bold text-gray-950" : "bg-white text-gray-700"
      }`}
    >
      <dt className="min-w-0 text-sm">{label}</dt>
      <dd className="text-right text-sm tabular-nums">{formatEuro(value)}</dd>
    </div>
  );
}

function CalculatorSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-md border border-gray-200 bg-white">
      <h3 className="border-b border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-950">
        {title}
      </h3>
      <dl>{children}</dl>
    </section>
  );
}

export function BalanceCalculatorPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [data, setData] = useState<BalanceCalculationResponse | null>(null);
  const [savedInputs, setSavedInputs] = useState<BalanceInputs | null>(null);
  const [inputValues, setInputValues] = useState<
    Record<BalanceInputKey, string> | null
  >(null);
  const [saveStates, setSaveStates] = useState(createSaveStates);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const saveVersions = useRef<Partial<Record<BalanceInputKey, number>>>({});

  useEffect(() => {
    const checkAuthStatus = async () => {
      if (!sessionStorage.getItem("dashboard_authenticated")) {
        setIsAuthenticated(false);
        return;
      }

      try {
        const response = await fetch("/api/auth/verify", {
          credentials: "include",
        });
        const result = await response.json();
        if (result.authenticated) {
          setIsAuthenticated(true);
          sessionStorage.setItem("dashboard_authenticated", "true");
        } else {
          setIsAuthenticated(false);
          sessionStorage.removeItem("dashboard_authenticated");
        }
      } catch (authError) {
        console.error("Error checking auth:", authError);
        setIsAuthenticated(false);
        sessionStorage.removeItem("dashboard_authenticated");
      }
    };

    void checkAuthStatus();
  }, []);

  const loadCalculation = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/balance-calculation", {
        credentials: "include",
        cache: "no-store",
      });
      if (!response.ok) {
        if (handleUnauthorized(response)) {
          setIsAuthenticated(false);
          return;
        }
        const body = (await response.json().catch(() => null)) as
          | { error?: string }
          | null;
        throw new Error(body?.error ?? "Failed to load balance calculation");
      }

      const result = (await response.json()) as BalanceCalculationResponse;
      setData(result);
      setSavedInputs(result.inputs);
      setInputValues(createInputValues(result.inputs));
      setSaveStates(createSaveStates());
    } catch (loadError) {
      console.error("Error loading balance calculation:", loadError);
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load balance calculation"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      void loadCalculation();
    }
  }, [isAuthenticated, loadCalculation]);

  const workingInputs = useMemo(() => {
    if (!savedInputs || !inputValues) {
      return null;
    }

    const nextInputs = { ...savedInputs };
    for (const key of BALANCE_INPUT_KEYS) {
      const parsed = parseEuroInput(inputValues[key]);
      if (parsed !== null) {
        nextInputs[key] = parsed;
      }
    }
    return nextInputs;
  }, [inputValues, savedInputs]);

  const results = useMemo(() => {
    if (!workingInputs || !data) {
      return null;
    }
    return calculateBalance(workingInputs, data.fixedValues);
  }, [data, workingInputs]);

  const handleInputChange = (field: BalanceInputKey, value: string) => {
    setInputValues((current) =>
      current ? { ...current, [field]: value } : current
    );
    setSaveStates((current) => ({
      ...current,
      [field]: { status: "idle" },
    }));
  };

  const saveField = useCallback(
    async (field: BalanceInputKey, explicitValue?: number) => {
      if (!inputValues || !savedInputs) {
        return;
      }

      const parsed =
        explicitValue ?? parseEuroInput(inputValues[field]);
      if (parsed === null) {
        setSaveStates((current) => ({
          ...current,
          [field]: { status: "error", message: "Enter a valid amount" },
        }));
        return;
      }

      const normalizedText = formatInput(parsed);
      setInputValues((current) =>
        current ? { ...current, [field]: normalizedText } : current
      );

      if (eurosToCents(savedInputs[field]) === eurosToCents(parsed)) {
        setSaveStates((current) => ({
          ...current,
          [field]: { status: "saved" },
        }));
        return;
      }

      const version = (saveVersions.current[field] ?? 0) + 1;
      saveVersions.current[field] = version;
      setSaveStates((current) => ({
        ...current,
        [field]: { status: "saving" },
      }));

      try {
        const response = await fetch("/api/balance-calculation", {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ field, value: parsed }),
        });
        if (!response.ok) {
          if (handleUnauthorized(response)) {
            setIsAuthenticated(false);
            return;
          }
          const body = (await response.json().catch(() => null)) as
            | { error?: string }
            | null;
          throw new Error(body?.error ?? "Save failed");
        }

        const saved = (await response.json()) as BalancePatchResponse;
        if (saveVersions.current[field] !== version) {
          return;
        }
        setSavedInputs((current) =>
          current ? { ...current, [field]: saved.value } : current
        );
        setInputValues((current) =>
          current ? { ...current, [field]: formatInput(saved.value) } : current
        );
        setSaveStates((current) => ({
          ...current,
          [field]: { status: "saved" },
        }));
      } catch (saveError) {
        console.error(`Error saving ${field}:`, saveError);
        if (saveVersions.current[field] !== version) {
          return;
        }
        setSaveStates((current) => ({
          ...current,
          [field]: { status: "error", message: "Save failed - blur to retry" },
        }));
      }
    },
    [inputValues, savedInputs]
  );

  if (isAuthenticated === null) {
    return <LoadingSkeleton type="dashboard" />;
  }

  if (!isAuthenticated) {
    return <PasscodePrompt onAuthenticated={() => setIsAuthenticated(true)} />;
  }

  if (loading) {
    return <LoadingSkeleton type="dashboard" />;
  }

  if (error || !data || !inputValues || !workingInputs || !results) {
    return (
      <main className="container mx-auto px-4 py-8 sm:py-10">
        <DashboardNav />
        <div className="mx-auto max-w-3xl border-l-4 border-red-500 bg-red-50 p-4 text-red-800">
          <h2 className="font-bold">Balance Calculation Unavailable</h2>
          <p className="mt-1 text-sm">{error ?? "Unable to load calculator data."}</p>
          <button
            type="button"
            onClick={() => void loadCalculation()}
            className="mt-4 rounded bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  const targetMatchesNotion =
    data.notionTarget !== null &&
    eurosToCents(workingInputs.targetBalance) ===
      eurosToCents(data.notionTarget);
  const differenceIsZero = eurosToCents(results.difference) === 0;

  return (
    <main className="container mx-auto px-4 py-8 sm:py-10">
      <DashboardNav />
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase text-blue-700">
              Reconciliation
            </p>
            <h2 className="mt-1 text-2xl font-bold text-gray-950 sm:text-3xl">
              Balance Calculation
            </h2>
          </div>
          <button
            type="button"
            disabled={data.notionTarget === null || targetMatchesNotion}
            onClick={() => {
              if (data.notionTarget !== null) {
                void saveField("targetBalance", data.notionTarget);
              }
            }}
            className="rounded border border-blue-300 bg-white px-3 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Use live Notion balance
          </button>
        </div>

        {data.warnings.map((warning) => (
          <div
            key={warning}
            role="status"
            className="mb-4 border-l-4 border-amber-500 bg-amber-50 p-3 text-sm text-amber-900"
          >
            {warning}
          </div>
        ))}

        <section className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="min-h-32 rounded-md border border-blue-200 bg-[#d7e8f7] p-4">
            <label
              htmlFor="balance-input-targetBalance"
              className="text-xs font-bold uppercase text-blue-800"
            >
              Saved Target
            </label>
            <div className="mt-3 flex items-center rounded border border-blue-300 bg-white px-2 focus-within:border-blue-600 focus-within:ring-2 focus-within:ring-blue-200">
              <span aria-hidden="true" className="text-gray-500">
                €
              </span>
              <input
                id="balance-input-targetBalance"
                type="text"
                inputMode="decimal"
                value={inputValues.targetBalance}
                onChange={(event) =>
                  handleInputChange("targetBalance", event.target.value)
                }
                onBlur={() => void saveField("targetBalance")}
                disabled={saveStates.targetBalance.status === "saving"}
                aria-invalid={saveStates.targetBalance.status === "error"}
                className="min-w-0 flex-1 bg-transparent px-2 py-2 text-right text-xl font-bold tabular-nums text-gray-950 outline-none disabled:cursor-wait"
              />
            </div>
            <p
              aria-live="polite"
              className={`mt-2 h-4 text-xs ${
                saveStates.targetBalance.status === "error"
                  ? "text-red-700"
                  : "text-blue-800"
              }`}
            >
              {saveStates.targetBalance.status === "saving" ? "Saving..." : null}
              {saveStates.targetBalance.status === "saved" ? "Saved" : null}
              {saveStates.targetBalance.status === "error" ? (
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => void saveField("targetBalance")}
                  className="font-semibold underline underline-offset-2"
                >
                  {saveStates.targetBalance.message} - retry
                </button>
              ) : null}
            </p>
          </div>

          <div className="min-h-32 rounded-md border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-bold uppercase text-amber-800">
              Live Notion Balance
            </p>
            <p className="mt-4 text-2xl font-bold tabular-nums text-gray-950">
              {data.notionTarget === null
                ? "Unavailable"
                : formatEuro(data.notionTarget)}
            </p>
            <p className="mt-2 text-xs text-amber-900">
              {data.notionTarget === null
                ? "Comparison unavailable"
                : targetMatchesNotion
                  ? "Target is in sync"
                  : "Target differs from Notion"}
            </p>
          </div>

          <div className="min-h-32 rounded-md border border-gray-200 bg-white p-4">
            <p className="text-xs font-bold uppercase text-gray-600">
              Calculated Actual
            </p>
            <p className="mt-4 text-2xl font-bold tabular-nums text-gray-950">
              {formatEuro(results.actualBalance)}
            </p>
          </div>

          <div
            className={`min-h-32 rounded-md border p-4 ${
              differenceIsZero
                ? "border-green-200 bg-green-50"
                : "border-red-200 bg-red-50"
            }`}
          >
            <p
              className={`text-xs font-bold uppercase ${
                differenceIsZero ? "text-green-800" : "text-red-800"
              }`}
            >
              Difference
            </p>
            <p className="mt-4 text-2xl font-bold tabular-nums text-gray-950">
              {formatEuro(results.difference)}
            </p>
            <p
              className={`mt-2 text-xs ${
                differenceIsZero ? "text-green-800" : "text-red-800"
              }`}
            >
              {differenceIsZero ? "Balances match" : "Reconciliation required"}
            </p>
          </div>
        </section>

        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="space-y-5">
            <CalculatorSection title="Trading 212 - Interest on Cash">
              <ReadOnlyAmountRow
                label="Jan 1st"
                value={data.fixedValues.trading212InterestOpening}
              />
              <EditableAmountRow
                field="trading212InterestToday"
                label="Today"
                value={inputValues.trading212InterestToday}
                saveState={saveStates.trading212InterestToday}
                onChange={handleInputChange}
                onSave={(field) => void saveField(field)}
              />
              <ReadOnlyAmountRow
                label="This Year"
                value={results.trading212InterestThisYear}
                emphasized
              />
            </CalculatorSection>

            <CalculatorSection title="Trading 212 - Cashback">
              <EditableAmountRow
                field="cashbackAllTime"
                label="All Time"
                value={inputValues.cashbackAllTime}
                saveState={saveStates.cashbackAllTime}
                onChange={handleInputChange}
                onSave={(field) => void saveField(field)}
              />
              <ReadOnlyAmountRow
                label="Invested"
                value={data.fixedValues.cashbackInvested}
              />
              <ReadOnlyAmountRow
                label="Uninvested"
                value={results.cashbackUninvested}
                emphasized
              />
              <EditableAmountRow
                field="cashbackPending"
                label="Pending"
                value={inputValues.cashbackPending}
                saveState={saveStates.cashbackPending}
                onChange={handleInputChange}
                onSave={(field) => void saveField(field)}
              />
              <ReadOnlyAmountRow
                label="Received"
                value={results.cashbackReceived}
                emphasized
              />
            </CalculatorSection>

            <CalculatorSection title="Revolut - Flexible Cash Funds">
              <ReadOnlyAmountRow
                label="Jan 1st"
                value={data.fixedValues.revolutFlexibleOpening}
              />
              <EditableAmountRow
                field="revolutFlexibleToday"
                label="Today"
                value={inputValues.revolutFlexibleToday}
                saveState={saveStates.revolutFlexibleToday}
                onChange={handleInputChange}
                onSave={(field) => void saveField(field)}
              />
              <ReadOnlyAmountRow
                label="This Year"
                value={results.revolutFlexibleThisYear}
                emphasized
              />
            </CalculatorSection>
          </div>

          <CalculatorSection title="Checking Balance Calculation">
            <EditableAmountRow
              field="cash"
              label="Cash"
              value={inputValues.cash}
              saveState={saveStates.cash}
              onChange={handleInputChange}
              onSave={(field) => void saveField(field)}
            />
            <EditableAmountRow
              field="revolutCash"
              label="Revolut - Cash"
              value={inputValues.revolutCash}
              saveState={saveStates.revolutCash}
              onChange={handleInputChange}
              onSave={(field) => void saveField(field)}
            />
            <ReadOnlyAmountRow
              label="Revolut - Flexible Cash Funds"
              value={data.fixedValues.revolutFlexibleOpening}
            />
            <EditableAmountRow
              field="trading212Cash"
              label="Trading 212 - Cash"
              value={inputValues.trading212Cash}
              saveState={saveStates.trading212Cash}
              onChange={handleInputChange}
              onSave={(field) => void saveField(field)}
            />
            <ReadOnlyAmountRow
              label="Trading 212 - Interest on Cash"
              value={results.trading212InterestAdjustment}
            />
            <ReadOnlyAmountRow
              label="Trading 212 - Cashback"
              value={results.cashbackAdjustment}
            />
            <ReadOnlyAmountRow
              label="Actual"
              value={results.actualBalance}
              emphasized
            />
          </CalculatorSection>
        </div>
      </div>
    </main>
  );
}
