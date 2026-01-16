import Link from "next/link";
import Image from "next/image";
import { Lock, Users, ArrowRight, Building2, Eye, EyeOff, Shield, FileText, Send, Sparkles, ChevronRight } from "lucide-react";

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
              priority
            />
            <span className="text-xl font-display font-bold tracking-tight">StealthPay</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              How it Works
            </a>
            <a href="#use-cases" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">
              Use Cases
            </a>
          </nav>
          <Link
            href="/dashboard"
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-amber-950 px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 text-sm shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 btn-shine flex items-center gap-2"
          >
            Launch App
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6">
        {/* Hero */}
        <section className="py-24 md:py-32 text-center relative">
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
            Pay your team and invoice clients on Solana without exposing
            <br className="hidden md:block" />
            wallet addresses or amounts on-chain.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-in" style={{ animationDelay: "150ms" }}>
            <Link
              href="/dashboard"
              className="relative bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-amber-950 px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 shadow-xl shadow-amber-500/30 hover:shadow-amber-500/50 flex items-center gap-2 w-full sm:w-auto justify-center group btn-shine glow-amber-sm hover:glow-amber"
            >
              Launch App
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <a
              href="#how-it-works"
              className="glass-card hover:bg-white/10 dark:hover:bg-white/5 px-8 py-4 rounded-2xl font-semibold text-lg transition-all duration-300 w-full sm:w-auto text-center"
            >
              Learn More
            </a>
          </div>
        </section>

        {/* Problem/Solution */}
        <section id="how-it-works" className="py-20">
          <div className="text-center mb-16">
            <h2 className="heading-1 mb-4">The Problem with On-Chain Payroll</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Blockchain transparency is great until it exposes your entire payroll
            </p>
          </div>

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
                    Recipient wallets hidden
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-500 text-xs shrink-0">✓</span>
                    Individual amounts hidden
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

        {/* How it works steps */}
        <section className="py-20">
          <div className="text-center mb-16">
            <h2 className="heading-1 mb-4">Three Steps to Privacy</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Get started in minutes
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-stretch gap-4 max-w-4xl mx-auto">
            {[
              {
                step: "1",
                icon: Building2,
                title: "Connect & Create",
                description: "Link your wallet and set up your organization. All data is encrypted.",
              },
              {
                step: "2",
                icon: Shield,
                title: "Fund Treasury",
                description: "Deposit USDC. Funds enter a ZK privacy pool powered by ShadowWire.",
              },
              {
                step: "3",
                icon: Send,
                title: "Pay Privately",
                description: "Run payroll or send invoices. Amounts and wallet addresses stay hidden.",
              },
            ].map((item, i) => (
              <div key={i} className="flex-1 relative group">
                <div className="glass-card rounded-2xl p-6 h-full hover:-translate-y-1 transition-all duration-300 flex flex-col">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500 font-display font-bold">
                      {item.step}
                    </div>
                    <item.icon className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-display font-semibold mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-2 transform -translate-y-1/2 text-muted-foreground/30 z-10">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Use Cases */}
        <section id="use-cases" className="py-20">
          <div className="text-center mb-16">
            <h2 className="heading-1 mb-4">Built For</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Whether you're paying or getting paid
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* For Employers */}
            <div className="glass-card rounded-3xl p-8 relative overflow-hidden group hover:-translate-y-1 transition-all duration-300 card-glow">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent" />
              <div className="relative">
                <div className="w-14 h-14 glass rounded-2xl flex items-center justify-center mb-6">
                  <Users className="w-7 h-7 text-amber-500" />
                </div>
                <h3 className="text-2xl font-display font-semibold mb-3">Teams & DAOs</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Run private payroll for your team. Individual salaries stay hidden on-chain while you maintain full visibility and audit trails.
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
                    Private employee wallets
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-500 text-xs">✓</span>
                    Compliance exports (CSV, JSON)
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
                <h3 className="text-2xl font-display font-semibold mb-3">Freelancers</h3>
                <p className="text-muted-foreground mb-6 leading-relaxed">
                  Create invoices and share payment links. Get paid privately, clients can't see your other income or wallet balance.
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
                    Private withdrawals
                  </li>
                  <li className="flex items-center gap-3">
                    <span className="w-5 h-5 rounded-full bg-teal-500/10 flex items-center justify-center text-teal-500 text-xs">✓</span>
                    Income reports for taxes
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Technology */}
        <section className="py-20">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 glass-card px-4 py-2 rounded-full text-xs font-medium mb-6">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-muted-foreground">Privacy Stack</span>
            </div>
            <h2 className="heading-1 mb-4">Built on Proven Technology</h2>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 max-w-3xl mx-auto">
            {[
              { name: "ShadowWire", desc: "ZK Transfers" },
              { name: "Privacy Cash", desc: "Private Withdrawals" },
              { name: "AES-256-GCM", desc: "Data Encryption" },
              { name: "Solana", desc: "Fast & Cheap" },
            ].map((tech, i) => (
              <div key={i} className="glass-card rounded-xl px-5 py-3 flex items-center gap-3">
                <Lock className="w-4 h-4 text-amber-500" />
                <div>
                  <div className="font-medium text-sm">{tech.name}</div>
                  <div className="text-xs text-muted-foreground">{tech.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="glass-card rounded-3xl p-12 md:p-16 text-center max-w-3xl mx-auto relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-cyan-500/5" />
            <div className="relative">
              <h2 className="text-2xl md:text-3xl font-display font-bold mb-4">
                Ready to protect your payroll?
              </h2>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                Join teams who value financial privacy. Set up in minutes.
              </p>
              <Link
                href="/dashboard"
                className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-amber-950 px-8 py-4 rounded-2xl font-semibold text-lg inline-flex items-center gap-2 transition-all duration-300 group shadow-xl shadow-amber-500/25 hover:shadow-amber-500/40"
              >
                Launch App
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 glass-strong">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="StealthPay"
                width={32}
                height={32}
              />
              <span className="font-display font-semibold">StealthPay</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#how-it-works" className="hover:text-foreground transition-colors">How it Works</a>
              <a href="#use-cases" className="hover:text-foreground transition-colors">Use Cases</a>
              <a href="mailto:hello@stealthpay.io" className="hover:text-foreground transition-colors">Contact</a>
            </div>
            <p className="text-sm text-muted-foreground">
              Powered by <a href="https://radr.fun" target="_blank" rel="noopener noreferrer" className="text-amber-500 hover:text-amber-400 transition-colors">ShadowWire</a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
