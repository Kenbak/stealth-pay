"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Wallet,
  Clock,
  Settings,
  LogOut,
  Copy,
  Check,
  RefreshCw,
  ChevronDown,
  FileText,
} from "lucide-react";
import { cn, truncateAddress } from "@/lib/utils";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    name: "Invoices",
    href: "/dashboard/invoices",
    icon: FileText,
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
  const { publicKey, disconnect, wallet } = useWallet();
  const { setVisible } = useWalletModal();
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toBase58());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const changeWallet = () => {
    setVisible(true);
  };

  return (
    <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72 lg:flex-col">
      <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-white/[0.08] bg-white/50 dark:bg-black/40 backdrop-blur-2xl px-6 pb-4">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center gap-3">
          <Image
            src="/logo.png"
            alt="StealthPay"
            width={40}
            height={40}
          />
          <span className="text-xl font-display font-bold tracking-tight">StealthPay</span>
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
                          "group flex gap-x-3 rounded-xl p-3 text-sm font-medium leading-6 transition-all duration-200",
                          isActive
                            ? "bg-gradient-to-r from-amber-500/10 to-amber-500/5 text-amber-600 dark:text-amber-400 shadow-sm"
                            : "text-muted-foreground hover:bg-white/50 dark:hover:bg-white/5 hover:text-foreground"
                        )}
                      >
                        <item.icon
                          className={cn(
                            "h-5 w-5 shrink-0 transition-colors",
                            isActive
                              ? "text-amber-500"
                              : "text-muted-foreground group-hover:text-foreground"
                          )}
                        />
                        {item.name}
                        {isActive && (
                          <div className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-500" />
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>

            {/* User section */}
            <li className="mt-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="w-full rounded-2xl bg-white/50 dark:bg-white/[0.03] backdrop-blur-sm border border-black/[0.04] dark:border-white/[0.06] p-4 hover:bg-white/70 dark:hover:bg-white/[0.05] transition-colors">
                    <div className="flex items-center gap-x-3">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/20 flex items-center justify-center">
                        <Wallet className="h-4 w-4 text-amber-500" />
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-xs text-muted-foreground">Connected</p>
                        <p className="font-mono text-sm truncate">
                          {publicKey ? truncateAddress(publicKey.toBase58()) : "Not connected"}
                        </p>
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={copyAddress}>
                    {copied ? (
                      <Check className="h-4 w-4 mr-2 text-teal-500" />
                    ) : (
                      <Copy className="h-4 w-4 mr-2" />
                    )}
                    {copied ? "Copied!" : "Copy Address"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={changeWallet}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Change Wallet
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => disconnect()}
                    className="text-red-500 focus:text-red-500"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Disconnect
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          </ul>
        </nav>
      </div>
    </aside>
  );
}
