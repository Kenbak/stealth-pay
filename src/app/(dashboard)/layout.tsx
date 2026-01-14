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
      <div className="min-h-screen bg-background">
        <Sidebar />
        <div className="lg:pl-72">
          <Header />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </RequireWallet>
  );
}
