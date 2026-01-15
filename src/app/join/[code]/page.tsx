"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import Image from "next/image";
import Link from "next/link";
import { Shield, CheckCircle2, AlertCircle, Loader2, Wallet, Lock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deriveStealthPayWallet } from "@/lib/stealth-wallet";

interface InviteData {
  organizationId: string;
  organizationName: string;
  employeeName: string;
  salary: number;
  expiresAt: string | null;
}

type PageState = "loading" | "invite" | "connecting" | "deriving" | "registering" | "success" | "error";

export default function JoinPage() {
  const params = useParams();
  const code = params?.code as string;
  const { publicKey, connected, signMessage } = useWallet();
  const { setVisible } = useWalletModal();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stealthPayWallet, setStealthPayWallet] = useState<string | null>(null);

  // Fetch invite details
  useEffect(() => {
    async function fetchInvite() {
      if (!code) return;

      try {
        const res = await fetch(`/api/employees/invite/${code}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Invalid invite");
          setPageState("error");
          return;
        }

        setInvite(data.invite);
        setPageState("invite");
      } catch {
        setError("Failed to load invite");
        setPageState("error");
      }
    }

    fetchInvite();
  }, [code]);

  // Handle wallet connection and derivation
  const handleConnect = () => {
    setVisible(true);
    setPageState("connecting");
  };

  // When wallet connects, derive StealthPay wallet
  useEffect(() => {
    async function deriveAndRegister() {
      if (!connected || !publicKey || !signMessage || !invite || pageState !== "connecting") {
        return;
      }

      setPageState("deriving");

      try {
        // Derive StealthPay wallet
        const { publicKey: stealthWallet } = await deriveStealthPayWallet(
          publicKey,
          signMessage,
          invite.organizationId
        );

        const stealthWalletAddress = stealthWallet.toBase58();
        setStealthPayWallet(stealthWalletAddress);

        setPageState("registering");

        // Register the StealthPay wallet (include main wallet for login lookup)
        const res = await fetch(`/api/employees/invite/${code}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            stealthPayWallet: stealthWalletAddress,
            mainWallet: publicKey.toBase58(), // Hashed server-side for privacy
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to register");
          setPageState("error");
          return;
        }

        setPageState("success");
      } catch (err) {
        console.error("Registration error:", err);
        if (err instanceof Error && err.message.includes("rejected")) {
          setError("You need to sign the message to create your private wallet");
        } else {
          setError(err instanceof Error ? err.message : "Failed to register");
        }
        setPageState("error");
      }
    }

    deriveAndRegister();
  }, [connected, publicKey, signMessage, invite, pageState, code]);

  // Common layout wrapper
  const PageWrapper = ({ children }: { children: React.ReactNode }) => (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated gradient orbs background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="orb orb-amber w-[600px] h-[600px] top-[-200px] left-[-100px]" />
        <div className="orb orb-cyan w-[500px] h-[500px] top-[20%] right-[-150px]" style={{ animationDelay: "-5s" }} />
        <div className="orb orb-violet w-[400px] h-[400px] bottom-[-100px] left-[30%]" style={{ animationDelay: "-10s" }} />
      </div>

      {/* Noise texture */}
      <div className="fixed inset-0 -z-10 noise" />

      {/* Header */}
      <header className="glass sticky top-0 z-50 border-b border-white/10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="StealthPay"
              width={40}
              height={40}
            />
            <span className="text-xl font-display font-bold tracking-tight">StealthPay</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 flex items-center justify-center min-h-[80vh]">
        {children}
      </main>
    </div>
  );

  // Loading state
  if (pageState === "loading") {
    return (
      <PageWrapper>
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading invite...</span>
        </div>
      </PageWrapper>
    );
  }

  // Error state
  if (pageState === "error") {
    return (
      <PageWrapper>
        <div className="glass-card p-8 rounded-3xl max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h1 className="text-2xl font-display font-bold mb-2">Something went wrong</h1>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Link href="/">
            <Button variant="outline">Go to Homepage</Button>
          </Link>
        </div>
      </PageWrapper>
    );
  }

  // Success state
  if (pageState === "success" && invite) {
    return (
      <PageWrapper>
        <div className="glass-card p-8 rounded-3xl max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-teal-500/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-teal-500" />
            </div>
            <h1 className="text-2xl font-display font-bold mb-2">You&apos;re all set!</h1>
            <p className="text-muted-foreground">
              Welcome to <span className="text-foreground font-medium">{invite.organizationName}</span>
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-muted-foreground">Your salary</span>
                <span className="font-display font-semibold">${invite.salary.toLocaleString()} USDC/month</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">StealthPay Wallet</span>
                <span className="font-mono text-xs">
                  {stealthPayWallet?.slice(0, 8)}...{stealthPayWallet?.slice(-6)}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-teal-500/5 border border-teal-500/20">
              <div className="flex items-start gap-3">
                <Lock className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-teal-400">Your privacy is protected</p>
                  <p className="text-muted-foreground mt-1">
                    Your employer can only see your StealthPay wallet. They cannot see
                    your personal wallet or track your spending.
                  </p>
                </div>
              </div>
            </div>

            <Link href="/dashboard" className="block">
              <Button className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-amber-950 h-12 text-base font-semibold">
                Go to Dashboard
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>

            <p className="text-xs text-center text-muted-foreground">
              Log in with your wallet to view payments and withdraw funds
            </p>
          </div>
        </div>
      </PageWrapper>
    );
  }

  // Processing states (connecting, deriving, registering)
  if (pageState === "connecting" || pageState === "deriving" || pageState === "registering") {
    const messages: Record<string, { title: string; description: string }> = {
      connecting: {
        title: "Connect Your Wallet",
        description: "Select your wallet to continue",
      },
      deriving: {
        title: "Creating Private Wallet",
        description: "Sign the message to create your StealthPay wallet",
      },
      registering: {
        title: "Registering...",
        description: "Setting up your private payroll",
      },
    };

    const current = messages[pageState];

    return (
      <PageWrapper>
        <div className="glass-card p-8 rounded-3xl max-w-md w-full text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
          <h1 className="text-2xl font-display font-bold mb-2">{current.title}</h1>
          <p className="text-muted-foreground">{current.description}</p>
          {pageState === "deriving" && (
            <p className="text-xs mt-4 text-muted-foreground">
              Check your wallet for a signature request
            </p>
          )}
        </div>
      </PageWrapper>
    );
  }

  // Invite state (main view)
  return (
    <PageWrapper>
      <div className="glass-card p-8 rounded-3xl max-w-md w-full">
        <div className="text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-2xl font-display font-bold mb-2">
            Welcome, {invite?.employeeName}!
          </h1>
          <p className="text-muted-foreground">
            You&apos;ve been invited to join{" "}
            <span className="text-foreground font-medium">{invite?.organizationName}</span>
          </p>
        </div>

        <div className="space-y-4">
          {/* Salary info */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 to-amber-600/5 border border-amber-500/20 text-center">
            <p className="text-sm text-muted-foreground mb-1">Your Monthly Salary</p>
            <p className="text-4xl font-display font-bold text-amber-500">
              ${invite?.salary.toLocaleString()}
              <span className="text-lg text-muted-foreground ml-2">USDC</span>
            </p>
          </div>

          {/* Privacy info */}
          <div className="p-4 rounded-2xl bg-teal-500/5 border border-teal-500/20">
            <div className="flex items-start gap-3">
              <Lock className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
              <div className="text-sm space-y-1.5">
                <p className="font-medium text-teal-400">Privacy Protected Payroll</p>
                <ul className="text-muted-foreground space-y-1">
                  <li>• Your personal wallet stays private</li>
                  <li>• Employer can&apos;t see your balance</li>
                  <li>• Withdraw to any wallet, anytime</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Expiry warning */}
          {invite?.expiresAt && (
            <p className="text-xs text-center text-muted-foreground">
              This invite expires on{" "}
              {new Date(invite.expiresAt).toLocaleDateString()}
            </p>
          )}

          {/* Connect button */}
          <Button
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-amber-950 h-12 text-base font-semibold"
            onClick={handleConnect}
          >
            <Wallet className="w-4 h-4 mr-2" />
            Connect Wallet to Accept
          </Button>

          <p className="text-xs text-center text-muted-foreground">
            You&apos;ll sign a message to create your private receiving address.
            <br />
            This does not require any transaction or fee.
          </p>
        </div>
      </div>
    </PageWrapper>
  );
}
