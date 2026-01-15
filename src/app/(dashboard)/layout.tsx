import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import { RequireWallet } from "@/components/auth/require-wallet";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RequireWallet>
      <div className="min-h-screen bg-background relative">
        {/* Subtle gradient mesh for dashboard */}
        <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute w-[500px] h-[500px] top-[-100px] right-[-100px] bg-amber-500/[0.03] rounded-full blur-3xl" />
          <div className="absolute w-[400px] h-[400px] bottom-[-100px] left-[20%] bg-violet-500/[0.02] rounded-full blur-3xl" />
        </div>

        <Sidebar />
        <div className="lg:pl-72">
          <Header />
          <main className="p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </RequireWallet>
  );
}
