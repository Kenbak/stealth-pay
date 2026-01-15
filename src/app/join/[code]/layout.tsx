import { WalletProvider } from "@/components/wallet-provider";

export default function JoinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <WalletProvider>{children}</WalletProvider>;
}
