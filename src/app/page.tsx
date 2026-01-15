import Link from "next/link";
import { Shield, Lock, Users, Zap, ArrowRight, CheckCircle2, Building2, Globe, TrendingUp } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-stealth-950/20">
      {/* Header */}
      <header className="border-b border-border/50 backdrop-blur-sm sticky top-0 z-50 bg-background/80">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="w-8 h-8 text-stealth-500" />
            <span className="text-xl font-bold">StealthPay</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
              Features
            </a>
            <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors text-sm">
              How it Works
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="bg-stealth-600 hover:bg-stealth-700 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4">
        {/* Hero */}
        <section className="py-20 md:py-32 text-center">
          <div className="inline-flex items-center gap-2 bg-stealth-500/10 text-stealth-600 dark:text-stealth-400 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Lock className="w-4 h-4" />
            Powered by Zero-Knowledge Proofs
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 tracking-tight max-w-4xl mx-auto">
            Private Payroll
            <br />
            <span className="text-gradient">for Modern Teams</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Pay your team on Solana without exposing salaries on-chain.
            <br className="hidden md:block" />
            Complete confidentiality with zero-knowledge proofs.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/dashboard"
              className="bg-stealth-600 hover:bg-stealth-700 text-white px-8 py-4 rounded-xl font-medium text-lg transition-all hover:scale-105 flex items-center gap-2 w-full sm:w-auto justify-center"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </Link>
            <a
              href="#how-it-works"
              className="bg-secondary hover:bg-secondary/80 text-secondary-foreground px-8 py-4 rounded-xl font-medium text-lg transition-colors w-full sm:w-auto text-center"
            >
              See How It Works
            </a>
          </div>

          {/* Trust badges */}
          <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-muted-foreground text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-stealth-500" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-stealth-500" />
              <span>Set up in 5 minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-stealth-500" />
              <span>SOC 2 compliant</span>
            </div>
          </div>
        </section>

        {/* Problem/Solution */}
        <section className="py-16">
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Problem */}
            <div className="bg-red-500/5 border border-red-500/20 rounded-2xl p-8">
              <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-4">
                Traditional On-Chain Payroll
              </h3>
              <div className="font-mono text-xs bg-background/50 rounded-lg p-4 mb-4">
                <div className="text-muted-foreground mb-2"># Anyone can see:</div>
                <div className="text-red-500">Company → Alice: 8,500 USDC</div>
                <div className="text-red-500">Company → Bob: 12,000 USDC</div>
                <div className="text-red-500">Company → Carol: 15,500 USDC</div>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="text-red-500">✗</span>
                  Competitors see your burn rate
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-red-500">✗</span>
                  Employees compare salaries
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-red-500">✗</span>
                  Top earners targeted by scammers
                </li>
              </ul>
            </div>

            {/* Solution */}
            <div className="bg-stealth-500/5 border border-stealth-500/20 rounded-2xl p-8">
              <h3 className="text-lg font-semibold text-stealth-600 dark:text-stealth-400 mb-4">
                With StealthPay
              </h3>
              <div className="font-mono text-xs bg-background/50 rounded-lg p-4 mb-4">
                <div className="text-muted-foreground mb-2"># On-chain visibility:</div>
                <div className="text-stealth-500">Company → Pool: 36,000 USDC</div>
                <div className="text-muted-foreground">Pool → ??? : ???</div>
                <div className="text-muted-foreground">Pool → ??? : ???</div>
              </div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <span className="text-stealth-500">✓</span>
                  Only total deposit visible
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-stealth-500">✓</span>
                  Individual payments hidden
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-stealth-500">✓</span>
                  ZK proofs ensure validity
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">How StealthPay Works</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Three simple steps to private payroll
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="relative">
              <div className="absolute -left-4 top-0 text-6xl font-bold text-stealth-500/10">1</div>
              <div className="bg-card border border-border rounded-xl p-6 relative">
                <div className="w-12 h-12 bg-stealth-500/10 rounded-lg flex items-center justify-center mb-4">
                  <Building2 className="w-6 h-6 text-stealth-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Set Up Your Organization</h3>
                <p className="text-muted-foreground text-sm">
                  Connect your wallet, add team members with their wallet addresses and salaries. All data encrypted.
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-4 top-0 text-6xl font-bold text-stealth-500/10">2</div>
              <div className="bg-card border border-border rounded-xl p-6 relative">
                <div className="w-12 h-12 bg-stealth-500/10 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-stealth-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Fund Your Treasury</h3>
                <p className="text-muted-foreground text-sm">
                  Deposit USDC into your private treasury. Funds enter a ZK privacy pool powered by ShadowWire.
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -left-4 top-0 text-6xl font-bold text-stealth-500/10">3</div>
              <div className="bg-card border border-border rounded-xl p-6 relative">
                <div className="w-12 h-12 bg-stealth-500/10 rounded-lg flex items-center justify-center mb-4">
                  <Lock className="w-6 h-6 text-stealth-500" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Execute Private Payroll</h3>
                <p className="text-muted-foreground text-sm">
                  Run payroll with one click. Each payment uses ZK proofs—amounts and recipients stay private.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-20">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Enterprise-grade payroll with Web3-native privacy
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                icon: Lock,
                title: "Zero-Knowledge Proofs",
                description: "Individual payments are cryptographically hidden while remaining verifiable on-chain.",
              },
              {
                icon: Users,
                title: "Team Management",
                description: "Add, edit, and manage employees with encrypted salary information.",
              },
              {
                icon: Globe,
                title: "Multi-Token Support",
                description: "Pay in USDC with automatic SOL conversion. More tokens coming soon.",
              },
              {
                icon: Shield,
                title: "Bank-Grade Encryption",
                description: "AES-256-GCM encryption for all data at rest. Your data is yours alone.",
              },
              {
                icon: TrendingUp,
                title: "Real-Time Dashboard",
                description: "Track treasury balance, payroll history, and team metrics in one place.",
              },
              {
                icon: Zap,
                title: "One-Click Execution",
                description: "Sign once to execute entire payroll. Batch processing for efficiency.",
              },
            ].map((feature, i) => (
              <div key={i} className="bg-card border border-border rounded-xl p-6 hover:border-stealth-500/50 transition-colors">
                <div className="w-10 h-10 bg-stealth-500/10 rounded-lg flex items-center justify-center mb-4">
                  <feature.icon className="w-5 h-5 text-stealth-500" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-24">
          <div className="bg-gradient-to-r from-stealth-600 to-stealth-700 rounded-3xl p-12 max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-white mb-4">
              Ready to protect your payroll?
            </h2>
            <p className="text-stealth-100 mb-8 max-w-lg mx-auto">
              Join forward-thinking teams who value privacy. Set up in minutes, no credit card required.
            </p>
            <Link
              href="/dashboard"
              className="bg-white text-stealth-700 px-8 py-4 rounded-xl font-medium text-lg inline-flex items-center gap-2 hover:bg-stealth-50 transition-colors"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Shield className="w-6 h-6 text-stealth-500" />
                <span className="font-bold">StealthPay</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Private payroll infrastructure for the next generation of organizations.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-foreground transition-colors">How it Works</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">About</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="mailto:hello@stealthpay.io" className="hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-border/50 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>© 2026 StealthPay. All rights reserved.</p>
            <p>Powered by <a href="https://radr.fun" target="_blank" rel="noopener noreferrer" className="text-stealth-500 hover:underline">ShadowWire</a> ZK Infrastructure</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
