"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  LayoutDashboard,
  Users,
  Wallet,
  Clock,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWallet } from "@solana/wallet-adapter-react";
import { truncateAddress } from "@/lib/utils";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Employees",
    href: "/dashboard/employees",
    icon: Users,
  },
  {
    name: "Payroll",
    href: "/dashboard/payroll",
    icon: Clock,
  },
  {
    name: "Treasury",
    href: "/dashboard/treasury",
    icon: Wallet,
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { publicKey, disconnect } = useWallet();

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-border bg-card px-6 pb-4">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center gap-2">
          <Shield className="h-8 w-8 text-stealth-500" />
          <span className="text-xl font-bold">StealthPay</span>
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col">
          <ul role="list" className="flex flex-1 flex-col gap-y-7">
            <li>
              <ul role="list" className="-mx-2 space-y-1">
                {navigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <li key={item.name}>
                      <Link
                        href={item.href}
                        className={cn(
                          "group flex gap-x-3 rounded-lg p-3 text-sm font-medium leading-6 transition-colors",
                          isActive
                            ? "bg-stealth-500/10 text-stealth-500"
                            : "text-muted-foreground hover:bg-accent hover:text-foreground"
                        )}
                      >
                        <item.icon
                          className={cn(
                            "h-5 w-5 shrink-0",
                            isActive
                              ? "text-stealth-500"
                              : "text-muted-foreground group-hover:text-foreground"
                          )}
                        />
                        {item.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>

            {/* User section */}
            <li className="mt-auto">
              <div className="flex items-center gap-x-4 px-2 py-3 text-sm font-medium">
                <div className="flex-1 truncate">
                  <p className="text-xs text-muted-foreground">Connected as</p>
                  <p className="font-mono text-sm">
                    {publicKey ? truncateAddress(publicKey.toBase58()) : "Not connected"}
                  </p>
                </div>
                {publicKey && (
                  <button
                    onClick={() => disconnect()}
                    className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
                    title="Disconnect wallet"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                )}
              </div>
            </li>
          </ul>
        </nav>
      </div>
    </aside>
  );
}
