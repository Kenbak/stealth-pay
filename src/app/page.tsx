import Link from "next/link";
import Image from "next/image";
import { Lock, Users, Zap, ArrowRight, CheckCircle2, Building2, Globe, TrendingUp, Eye, EyeOff, Shield, FileText, Send } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated gradient orbs background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="orb orb-amber w-[600px] h-[600px] top-[-200px] left-[-100px]" />
        <div className="orb orb-cyan w-[500px] h-[500px] top-[20%] right-[-150px]" style={{ animationDelay: '-5s' }} />
        <div className="orb orb-violet w-[400px] h-[400px] bottom-[-100px] left-[30%]" style={{ animationDelay: '-10s' }} />
        <div className="orb orb-amber w-[300px] h-[300px] bottom-[20%] right-[10%]" style={{ animationDelay: '-15s' }} />
      </div>

      {/* Noise texture */}
      <div className="fixed inset-0 -z-10 noise" />

      {/* Header */}
      <header className="glass sticky top-0 z-50 border-b border-white/10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="StealthPay"
              width={40}
              height={40}
            />
            <span className="text-xl font-display font-bold tracking-tight">StealthPay</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              Features
            </a>
            <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              How it Works
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors hidden sm:block font-medium"
            >
              Sign In
            </Link>
            <Link
              href="/dashboard"
              className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-amber-950 px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 text-sm shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 btn-shine"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6">
        {/* Hero */}
        <section className="py-24 md:py-36 text-center relative">
          <div className="inline-flex items-center gap-2 glass-card px-5 py-2.5 rounded-full text-sm font-medium mb-10 animate-in">
            <Lock className="w-4 h-4 text-amber-500" />
            <span className="text-foreground/80">Powered by Zero-Knowledge Proofs</span>
          </div>

          <h1 className="display mb-8 max-w-4xl mx-auto animate-in" style={{ animationDelay: "50ms" }}>
            Private Payments
            <br />
            <span className="text-gradient-vibrant">for Modern Teams</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-14 leading-relaxed animate-in" style={{ animationDelay: "100ms" }}>
            Pay your team and invoice clients on Solana—without exposing amounts on-chain.
            <br className="hidden md:block" />
            Complete confidentiality with zero-knowledge proofs.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in" style={{ animationDelay: "150ms" }}>
            <Link
              href="/dashboard"
              className="relative bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-amber-950 px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 shadow-xl shadow-amber-500/30 hover:shadow-amber-500/50 flex items-center gap-2 w-full sm:w-auto justify-center group btn-shine glow-amber-sm hover:glow-amber"
            >
              Get Started
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="#how-it-works"
              className="glass-card hover:bg-white/10 dark:hover:bg-white/5 px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 w-full sm:w-auto text-center"
            >
              See How It Works
            </a>
          </div>

          {/* Trust badges */}
          <div className="mt-20 flex flex-wrap items-center justify-center gap-8 text-muted-foreground text-sm animate-in" style={{ animationDelay: "200ms" }}>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-500" />
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-500" />
              <span>Set up in 5 minutes</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-500" />
              <span>SOC 2 compliant</span>
            </div>
          </div>
        </section>

        {/* Problem/Solution */}
        <section className="py-20">
          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {/* Problem */}
            <div className="glass-card rounded-3xl p-8 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent" />
              <div className="absolute top-4 right-4 opacity-50 group-hover:opacity-80 transition-opacity">
                <Eye className="w-6 h-6 text-red-500" />
              </div>
              <div className="relative">
                <h3 className="text-lg font-display font-semibold text-red-500 mb-4">
                  Traditional On-Chain Payroll
                </h3>
                <div className="font-mono text-xs glass rounded-xl p-4 mb-5 space-y-1">
                  <div className="text-muted-foreground/60"># Anyone can see:</div>
                  <div className="text-red-400">Company → Alice: 8,500 USDC</div>
                  <div className="text-red-400">Company → Bob: 12,000 USDC</div>
                  <div className="text-red-400">Company → Carol: 15,500 USDC</div>
                </div>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 text-xs shrink-0">✗</span>
                    Competitors see your burn rate
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 text-xs shrink-0">✗</span>
                    Employees compare salaries
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 text-xs shrink-0">✗</span>
                    Top earners targeted by scammers
                  </li>
                </ul>
              </div>
            </div>

            {/* Solution */}
            <div className="glass-card rounded-3xl p-8 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 card-glow">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent" />
              <div className="absolute top-4 right-4 opacity-50 group-hover:opacity-80 transition-opacity">
                <EyeOff className="w-6 h-6 text-amber-500" />
              </div>
              <div className="relative">
                <h3 className="text-lg font-display font-semibold text-amber-500 mb-4">
                  With StealthPay
                </h3>
                <div className="font-mono text-xs glass rounded-xl p-4 mb-5 space-y-1">
                  <div className="text-muted-foreground/60"># On-chain visibility:</div>
                  <div className="text-amber-400">Company → Pool: 36,000 USDC</div>
                  <div className="text-muted-foreground/30">Pool → ??? : ???</div>
                  <div className="text-muted-foreground/30">Pool → ??? : ???</div>
                </div>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-500 text-xs shrink-0">✓</span>
                    Only total deposit visible
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-500 text-xs shrink-0">✓</span>
                    Individual payments hidden
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-500 text-xs shrink-0">✓</span>
                    ZK proofs ensure validity
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Use Cases */}
        <section className="py-28">
          <div className="text-center mb-16">
            <h2 className="heading-1 mb-4">Two Ways to Use StealthPay</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Whether you're paying or getting paid, we've got you covered
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto stagger">
            {/* For Employers */}
            <div className="glass-card rounded-3xl p-8 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 card-glow">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent" />
              <div className="relative">
                <div className="w-14 h-14 glass rounded-2xl flex items-center justify-center mb-6">
                  <Users className="w-7 h-7 text-amber-500" />
                </div>
                <h3 className="text-2xl font-display font-semibold mb-3">For Employers</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Run private payroll for your team. Individual salaries stay hidden on-chain while you maintain full visibility.
                </p>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-500 text-xs">✓</span>
                    Batch payments with one signature
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-500 text-xs">✓</span>
                    Encrypted employee database
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-500 text-xs">✓</span>
                    Complete audit trail
                  </li>
                </ul>
              </div>
            </div>

            {/* For Freelancers */}
            <div className="glass-card rounded-3xl p-8 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 card-glow">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent" />
              <div className="relative">
                <div className="w-14 h-14 glass rounded-2xl flex items-center justify-center mb-6">
                  <FileText className="w-7 h-7 text-cyan-500" />
                </div>
                <h3 className="text-2xl font-display font-semibold mb-3">For Freelancers</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Create invoices and share payment links. Get paid privately—clients can't see your other income.
                </p>
                <ul className="space-y-3 text-sm">
                  <li className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-500 text-xs">✓</span>
                    Shareable payment links
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-500 text-xs">✓</span>
                    Client pays with any wallet
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-500 text-xs">✓</span>
                    Private payment history
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="py-28">
          <div className="text-center mb-16">
            <h2 className="heading-1 mb-4">How It Works</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Simple steps to private payments
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto stagger">
            {[
              {
                step: "01",
                icon: Building2,
                title: "Set Up Your Account",
                description: "Connect your wallet and create your organization. All your data is encrypted and secure.",
              },
              {
                step: "02",
                icon: Shield,
                title: "Fund Your Treasury",
                description: "Deposit USDC into your private treasury. Funds enter a ZK privacy pool powered by ShadowWire.",
              },
              {
                step: "03",
                icon: Send,
                title: "Pay or Invoice",
                description: "Run payroll for your team or create invoices for clients. All payments are private on-chain.",
              },
            ].map((item, i) => (
              <div key={i} className="relative group">
                <div className="absolute -top-6 -left-2 text-8xl font-display font-bold text-amber-500/[0.07] dark:text-amber-500/[0.05] select-none pointer-events-none">
                  {item.step}
                </div>
                <div className="glass-card rounded-3xl p-8 relative h-full hover:-translate-y-1 transition-all duration-300 card-glow">
                  <div className="w-14 h-14 glass rounded-2xl flex items-center justify-center mb-6 group-hover:shadow-lg group-hover:shadow-amber-500/10 transition-all">
                    <item.icon className="w-7 h-7 text-amber-500" />
                  </div>
                  <h3 className="text-xl font-display font-semibold mb-3">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section id="features" className="py-28">
          <div className="text-center mb-16">
            <h2 className="heading-1 mb-4">Everything You Need</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Enterprise-grade payroll with Web3-native privacy
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto stagger">
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
                icon: FileText,
                title: "Private Invoicing",
                description: "Create invoices and share payment links. Clients pay privately with any wallet.",
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
              <div key={i} className="glass-card rounded-2xl p-6 hover:-translate-y-1 transition-all duration-300 group card-glow">
                <div className="w-12 h-12 glass rounded-xl flex items-center justify-center mb-5 group-hover:shadow-lg group-hover:shadow-amber-500/10 transition-all">
                  <feature.icon className="w-6 h-6 text-amber-500" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-28">
          <div className="relative rounded-3xl overflow-hidden max-w-4xl mx-auto">
            {/* Multi-layer gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500 via-amber-500 to-orange-600" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.2),transparent_50%)]" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(0,0,0,0.1),transparent_50%)]" />

            {/* Animated shine */}
            <div className="absolute inset-0 opacity-30">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full animate-[shimmer_3s_infinite]" />
            </div>

            <div className="relative p-12 md:p-20 text-center">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-amber-950 mb-5">
                Ready to protect your payroll?
              </h2>
              <p className="text-amber-900/80 mb-12 max-w-lg mx-auto text-lg">
                Join forward-thinking teams who value privacy. Set up in minutes, no credit card required.
              </p>
              <Link
                href="/dashboard"
                className="bg-amber-950 text-amber-100 px-8 py-4 rounded-2xl font-semibold text-lg inline-flex items-center gap-2 hover:bg-amber-900 transition-all duration-300 group shadow-2xl shadow-amber-950/30"
              >
                Get Started
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-16 glass-strong">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-12 mb-12">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <Image
                  src="/logo.png"
                  alt="StealthPay"
                  width={36}
                  height={36}
                />
                <span className="font-display font-bold text-lg">StealthPay</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Private payroll infrastructure for the next generation of organizations.
              </p>
            </div>
            <div>
              <h4 className="font-display font-semibold mb-4">Product</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="hover:text-foreground transition-colors">How it Works</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-display font-semibold mb-4">Company</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">About</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="mailto:hello@stealthpay.io" className="hover:text-foreground transition-colors">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-display font-semibold mb-4">Legal</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
            <p>© 2026 StealthPay. All rights reserved.</p>
            <p>Powered by <a href="https://radr.fun" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:text-amber-400 transition-colors">ShadowWire</a> ZK Infrastructure</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
