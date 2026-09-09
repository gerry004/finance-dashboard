"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

interface DashboardNavProps {
  controls?: ReactNode;
}

const navigationItems = [
  { href: "/", label: "Checking" },
  { href: "/investments", label: "Investments" },
  { href: "/balance-calculation", label: "Balance" },
];

export function DashboardNav({ controls }: DashboardNavProps) {
  const pathname = usePathname();

  return (
    <header className="mb-8 border-b border-gray-200 pb-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h1 className="text-2xl font-bold text-gray-950 sm:text-3xl">
          Personal Finance Dashboard
        </h1>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <nav
            aria-label="Dashboard navigation"
            className="grid grid-cols-3 gap-1 rounded-md bg-gray-100 p-1"
          >
            {navigationItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`min-w-0 rounded px-3 py-2 text-center text-sm font-semibold transition-colors sm:px-4 ${
                    isActive
                      ? "bg-white text-blue-700 shadow-sm"
                      : "text-gray-600 hover:bg-gray-200 hover:text-gray-950"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
          {controls ? <div className="shrink-0">{controls}</div> : null}
        </div>
      </div>
    </header>
  );
}
