import Link from "next/link";
import { Shield, Lock, Users, Zap, ArrowRight, Github } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-stealth-950/20">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-8 h-8 text-stealth-500" />
            <span className="text-xl font-bold">StealthPay</span>
          </div>
          <nav className="flex items-center gap-6">
            <a
              href="https://github.com/YOUR_USERNAME/stealth-payroll"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <Github className="w-5 h-5" />
            </a>
            <Link
              href="/dashboard"
              className="bg-stealth-600 hover:bg-stealth-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Launch App
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4">
        <section className="py-24 text-center">
          <div className="inline-flex items-center gap-2 bg-stealth-500/10 text-stealth-500 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Lock className="w-4 h-4" />
            Built for Solana Privacy Hack 2026
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
            Private Payroll
            <br />
            <span className="text-gradient">on Solana</span>
          </h1>

          <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-12">
            Payroll where salaries stay confidential. Forever.
            <br />
            Pay your team with complete privacy using zero-knowledge proofs.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="bg-stealth-600 hover:bg-stealth-700 text-white px-8 py-4 rounded-xl font-medium text-lg transition-all hover:scale-105 flex items-center gap-2"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#how-it-works"
              className="bg-secondary hover:bg-secondary/80 text-secondary-foreground px-8 py-4 rounded-xl font-medium text-lg transition-colors"
            >
              Learn More
            </a>
          </div>
        </section>

        {/* Problem */}
        <section className="py-16">
          <div className="bg-destructive/5 border border-destructive/20 rounded-2xl p-8 md:p-12 max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-4 text-destructive">
              The Problem with On-Chain Payroll
            </h2>
            <div className="font-mono text-sm bg-background/50 rounded-lg p-4 mb-6">
              <div className="text-muted-foreground mb-2">
                # Everyone can see:
              </div>
              <div>0xCompany → 0xAlice: 5,000 USDC</div>
              <div>0xCompany → 0xBob: 7,500 USDC</div>
              <div>0xCompany → 0xCarol: 12,000 USDC</div>
            </div>
            <ul className="space-y-2 text-muted-foreground">
              <li>❌ Competitors analyze your cost structure</li>
              <li>❌ Employees compare salaries</li>
              <li>❌ High earners get targeted by scammers</li>
              <li>❌ Complete loss of payroll confidentiality</li>
            </ul>
          </div>
        </section>

        {/* Solution */}
        <section id="how-it-works" className="py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How StealthPay Works</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              We use Privacy Cash's zero-knowledge proofs to make individual
              payments invisible on-chain.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-card border border-border rounded-xl p-6">
              <div className="w-12 h-12 bg-stealth-500/10 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-stealth-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">1. Add Employees</h3>
              <p className="text-muted-foreground text-sm">
                Configure your team with wallet addresses and salaries. All data
                encrypted at rest.
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <div className="w-12 h-12 bg-stealth-500/10 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-stealth-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                2. Execute Payroll
              </h3>
              <p className="text-muted-foreground text-sm">
                Funds enter a privacy pool. Individual transfers use ZK proofs
                to hide amounts and recipients.
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-6">
              <div className="w-12 h-12 bg-stealth-500/10 rounded-lg flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-stealth-500" />
              </div>
              <h3 className="text-lg font-semibold mb-2">3. Complete Privacy</h3>
              <p className="text-muted-foreground text-sm">
                On-chain: only the total deposit is visible. Individual payments
                are completely private.
              </p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="py-16">
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <div className="space-y-6">
              <h2 className="text-3xl font-bold">Built for Web3 Teams</h2>
              <ul className="space-y-4">
                {[
                  "Private salary payments with ZK proofs",
                  "Multi-token support (USDC, USDT, SOL)",
                  "Dashboard for complete audit trail",
                  "Compliance-ready export for accounting",
                  "Wallet-based authentication",
                  "Encrypted data at rest",
                ].map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="w-5 h-5 bg-stealth-500 rounded-full flex items-center justify-center">
                      <Zap className="w-3 h-3 text-white" />
                    </div>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-gradient-to-br from-stealth-500/20 to-stealth-600/20 rounded-2xl p-8 flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl font-bold text-gradient mb-2">🔒</div>
                <p className="text-lg font-medium">100% Private</p>
                <p className="text-sm text-muted-foreground">
                  Individual payments invisible on-chain
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-24 text-center">
          <div className="bg-gradient-to-r from-stealth-600 to-stealth-700 rounded-3xl p-12 max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to pay your team privately?
            </h2>
            <p className="text-stealth-100 mb-8">
              Connect your wallet and start using StealthPay in minutes.
            </p>
            <Link
              href="/dashboard"
              className="bg-white text-stealth-700 px-8 py-4 rounded-xl font-medium text-lg inline-flex items-center gap-2 hover:bg-stealth-50 transition-colors"
            >
              Launch App
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-8">
        <div className="container mx-auto px-4 flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-stealth-500" />
            <span>StealthPay</span>
          </div>
          <div>
            Built with 🔒 for{" "}
            <a
              href="https://solana.com/privacyhack"
              target="_blank"
              rel="noopener noreferrer"
              className="text-stealth-500 hover:underline"
            >
              Solana Privacy Hack 2026
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
