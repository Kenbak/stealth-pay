"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Lock,
  ArrowLeft,
  Eye,
  Clock,
  Shuffle,
  Shield,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Globe,
  Search,
  Database,
  Link2,
  Fingerprint,
  TrendingUp,
  Users,
  Building2,
  Lightbulb,
  BookOpen,
  Trophy,
  RotateCcw,
  ChevronRight,
  Sparkles,
  GraduationCap,
  ScrollText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// Quiz questions
const quizQuestions = [
  {
    id: 1,
    question: "You just received your salary in crypto. When should you withdraw to maximize privacy?",
    options: [
      { text: "Immediately - speed is key", correct: false },
      { text: "Wait 24-48 hours before withdrawing", correct: true },
      { text: "Wait exactly 1 hour", correct: false },
      { text: "Always at the same time each day", correct: false },
    ],
    explanation: "Waiting 24-48 hours breaks the timing correlation between deposit and withdrawal, making analysis harder.",
  },
  {
    id: 2,
    question: "You received 5,000 USDC. What's the best withdrawal strategy?",
    options: [
      { text: "Withdraw exactly 5,000 USDC", correct: false },
      { text: "Withdraw 5,001 USDC to confuse trackers", correct: false },
      { text: "Split into multiple withdrawals of varying amounts", correct: true },
      { text: "Withdraw 100% as fast as possible", correct: false },
    ],
    explanation: "Splitting withdrawals into different amounts over time breaks the direct amount correlation.",
  },
  {
    id: 3,
    question: "What is 'wallet clustering'?",
    options: [
      { text: "A privacy feature that groups your wallets", correct: false },
      { text: "When analysts link multiple addresses to the same owner", correct: true },
      { text: "A way to speed up transactions", correct: false },
      { text: "A type of hardware wallet", correct: false },
    ],
    explanation: "Wallet clustering is when surveillance companies identify that multiple addresses belong to the same person.",
  },
  {
    id: 4,
    question: "Your employer deposits funds and immediately runs payroll. Is this good for privacy?",
    options: [
      { text: "Yes, it's efficient", correct: false },
      { text: "No, it creates an obvious timing pattern", correct: true },
      { text: "It doesn't matter", correct: false },
      { text: "Only if done on weekends", correct: false },
    ],
    explanation: "Immediate deposit→payroll creates a clear on-chain pattern. Depositing in advance breaks this link.",
  },
  {
    id: 5,
    question: "Which action would COMPROMISE your privacy?",
    options: [
      { text: "Using a VPN when transacting", correct: false },
      { text: "Tweeting 'just got paid!' with a timestamp", correct: true },
      { text: "Waiting before withdrawing", correct: false },
      { text: "Using different amounts", correct: false },
    ],
    explanation: "Public timestamps let anyone correlate your social media with on-chain transactions.",
  },
  {
    id: 6,
    question: "You have 3 wallets with funds. What should you avoid?",
    options: [
      { text: "Using them for different purposes", correct: false },
      { text: "Consolidating all funds into one 'main' wallet", correct: true },
      { text: "Keeping separate balances", correct: false },
      { text: "Using privacy tools", correct: false },
    ],
    explanation: "Consolidation transactions permanently cluster those addresses together, linking them to one identity.",
  },
  {
    id: 7,
    question: "What makes zero-knowledge proofs useful for privacy?",
    options: [
      { text: "They make transactions faster", correct: false },
      { text: "They prove you have funds without revealing amounts", correct: true },
      { text: "They eliminate all fees", correct: false },
      { text: "They are only for Bitcoin", correct: false },
    ],
    explanation: "ZK proofs let you prove a statement (like 'I have enough funds') without revealing the actual data.",
  },
];

export default function LearnPage() {
  const [viewMode, setViewMode] = useState<"choose" | "guide" | "quiz">("choose");
  const [showFloatingQuiz, setShowFloatingQuiz] = useState(false);
  const [quizStarted, setQuizStarted] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);

  // Show floating quiz button when scrolling in guide mode
  useEffect(() => {
    if (viewMode !== "guide") return;

    const handleScroll = () => {
      setShowFloatingQuiz(window.scrollY > 400);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [viewMode]);

  const startQuiz = () => {
    setViewMode("quiz");
    setQuizStarted(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleAnswer = (optionIndex: number) => {
    if (showExplanation) return;
    setSelectedAnswer(optionIndex);
    setShowExplanation(true);
    if (quizQuestions[currentQuestion].options[optionIndex].correct) {
      setScore(score + 1);
    }
  };

  const nextQuestion = () => {
    if (currentQuestion < quizQuestions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowExplanation(false);
    } else {
      setQuizCompleted(true);
    }
  };

  const resetQuiz = () => {
    setQuizStarted(false);
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowExplanation(false);
    setScore(0);
    setQuizCompleted(false);
  };

  const backToChoose = () => {
    setViewMode("choose");
    resetQuiz();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const getScoreMessage = () => {
    const percentage = (score / quizQuestions.length) * 100;
    if (percentage >= 85) return { emoji: "🏆", text: "Privacy Expert!", color: "text-amber-500" };
    if (percentage >= 70) return { emoji: "🌟", text: "Privacy Pro!", color: "text-teal-500" };
    if (percentage >= 50) return { emoji: "📚", text: "Getting There!", color: "text-blue-500" };
    return { emoji: "🔰", text: "Keep Learning!", color: "text-violet-500" };
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated gradient orbs background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="orb orb-violet w-[600px] h-[600px] top-[-200px] left-[-100px]" />
        <div className="orb orb-cyan w-[500px] h-[500px] top-[40%] right-[-150px]" style={{ animationDelay: '-5s' }} />
        <div className="orb orb-amber w-[400px] h-[400px] bottom-[-100px] left-[40%]" style={{ animationDelay: '-10s' }} />
      </div>

      {/* Noise texture */}
      <div className="fixed inset-0 -z-10 noise" />

      {/* Header */}
      <header className="glass sticky top-0 z-50 border-b border-white/10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <Image
              src="/logo.png"
              alt="StealthPay"
              width={40}
              height={40}
              priority
            />
            <span className="text-xl font-display font-bold tracking-tight">StealthPay</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>

      {/* Floating Quiz Button - appears when scrolling in guide mode */}
      {viewMode === "guide" && showFloatingQuiz && (
        <button
          onClick={startQuiz}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-400 hover:to-violet-500 text-white px-5 py-3 rounded-full font-semibold shadow-xl shadow-violet-500/30 hover:shadow-violet-500/50 transition-all animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          <Trophy className="w-5 h-5" />
          Take the Quiz
        </button>
      )}

      <main className="container mx-auto px-6 py-16 max-w-4xl">
        {/* Choose Your Path - Initial View */}
        {viewMode === "choose" && (
          <div className="min-h-[60vh] flex flex-col items-center justify-center">
            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 glass-card px-5 py-2.5 rounded-full text-sm font-medium mb-8">
                <BookOpen className="w-4 h-4 text-cyan-500" />
                <span className="text-foreground/80">Privacy Education</span>
              </div>

              <h1 className="text-4xl md:text-5xl font-display font-bold mb-6">
                Understanding Crypto
                <br />
                <span className="text-gradient-vibrant">Surveillance & Privacy</span>
              </h1>

              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Choose how you want to learn about protecting your financial privacy.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6 w-full max-w-2xl">
              {/* Read the Guide */}
              <button
                onClick={() => setViewMode("guide")}
                className="glass-card p-8 rounded-3xl text-left hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all group"
              >
                <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <ScrollText className="w-8 h-8 text-cyan-500" />
                </div>
                <h3 className="text-xl font-display font-bold mb-2">Read the Guide</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Deep dive into blockchain surveillance, why privacy matters, and practical OpSec tips.
                </p>
                <span className="text-cyan-500 text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                  Start Reading <ChevronRight className="w-4 h-4" />
                </span>
              </button>

              {/* Take the Quiz */}
              <button
                onClick={startQuiz}
                className="glass-card p-8 rounded-3xl text-left hover:border-violet-500/50 hover:bg-violet-500/5 transition-all group"
              >
                <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <GraduationCap className="w-8 h-8 text-violet-500" />
                </div>
                <h3 className="text-xl font-display font-bold mb-2">Take the Quiz</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Test your privacy knowledge with {quizQuestions.length} questions. See how much you know!
                </p>
                <span className="text-violet-500 text-sm font-medium flex items-center gap-1 group-hover:gap-2 transition-all">
                  Start Quiz <ChevronRight className="w-4 h-4" />
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Quiz Mode */}
        {viewMode === "quiz" && (
          <div className="animate-in fade-in duration-500">
            <button
              onClick={backToChoose}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium mb-8"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Learn
            </button>

            <div className="text-center mb-12">
              <div className="inline-flex items-center gap-2 glass-card px-5 py-2.5 rounded-full text-sm font-medium mb-6">
                <Trophy className="w-4 h-4 text-violet-500" />
                <span className="text-foreground/80">Privacy Quiz</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
                Test Your Privacy Knowledge
              </h1>
              <p className="text-muted-foreground">
                {quizQuestions.length} questions to check your OpSec skills
              </p>
            </div>

            {/* Quiz Content */}
            <div className="glass-card p-8 rounded-3xl max-w-2xl mx-auto">
              {!quizStarted && !quizCompleted ? (
                <div className="text-center py-8">
                  <Sparkles className="w-16 h-16 text-violet-400 mx-auto mb-6" />
                  <h3 className="text-2xl font-display font-bold mb-4">Ready?</h3>
                  <p className="text-muted-foreground mb-8">
                    Answer {quizQuestions.length} questions about privacy best practices.
                  </p>
                  <Button
                    onClick={() => setQuizStarted(true)}
                    className="bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-400 hover:to-violet-500 text-white px-8 py-6 text-lg"
                  >
                    Let's Go!
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              ) : quizCompleted ? (
                <div className="text-center py-8">
                  <div className="text-6xl mb-6">{getScoreMessage().emoji}</div>
                  <h3 className={cn("text-3xl font-display font-bold mb-2", getScoreMessage().color)}>
                    {getScoreMessage().text}
                  </h3>
                  <p className="text-xl text-muted-foreground mb-2">
                    You scored <span className="font-bold text-foreground">{score}</span> out of <span className="font-bold text-foreground">{quizQuestions.length}</span>
                  </p>
                  <p className="text-muted-foreground mb-8">
                    {score === quizQuestions.length
                      ? "Perfect score! You're a privacy master."
                      : score >= quizQuestions.length * 0.7
                        ? "Great job! You've got strong privacy fundamentals."
                        : "Keep learning! Privacy is a journey."}
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button
                      onClick={resetQuiz}
                      variant="outline"
                      className="gap-2"
                    >
                      <RotateCcw className="w-4 h-4" />
                      Try Again
                    </Button>
                    <Button
                      onClick={() => setViewMode("guide")}
                      className="gap-2"
                    >
                      <ScrollText className="w-4 h-4" />
                      Read the Guide
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="animate-in fade-in duration-300">
                  {/* Progress */}
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-sm text-muted-foreground">
                      Question {currentQuestion + 1} of {quizQuestions.length}
                    </span>
                    <div className="flex gap-1">
                      {quizQuestions.map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "w-2 h-2 rounded-full transition-all",
                            i < currentQuestion ? "bg-violet-500" :
                            i === currentQuestion ? "bg-violet-400 w-4" : "bg-muted"
                          )}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Question */}
                  <h3 className="text-xl font-semibold mb-6">
                    {quizQuestions[currentQuestion].question}
                  </h3>

                  {/* Options */}
                  <div className="space-y-3 mb-6">
                    {quizQuestions[currentQuestion].options.map((option, i) => (
                      <button
                        key={i}
                        onClick={() => handleAnswer(i)}
                        disabled={showExplanation}
                        className={cn(
                          "w-full p-4 rounded-2xl text-left transition-all border",
                          showExplanation
                            ? option.correct
                              ? "bg-emerald-500/10 border-emerald-500/50 text-emerald-400"
                              : selectedAnswer === i
                                ? "bg-rose-500/10 border-rose-500/50 text-rose-400"
                                : "bg-muted/30 border-transparent text-muted-foreground"
                            : "bg-muted/30 border-transparent hover:bg-muted/50 hover:border-violet-500/30"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-sm font-medium shrink-0",
                            showExplanation && option.correct
                              ? "bg-emerald-500 text-white"
                              : showExplanation && selectedAnswer === i && !option.correct
                                ? "bg-rose-500 text-white"
                                : "bg-muted"
                          )}>
                            {showExplanation && option.correct ? (
                              <CheckCircle className="w-4 h-4" />
                            ) : showExplanation && selectedAnswer === i && !option.correct ? (
                              <XCircle className="w-4 h-4" />
                            ) : (
                              String.fromCharCode(65 + i)
                            )}
                          </div>
                          <span>{option.text}</span>
                        </div>
                      </button>
                    ))}
                  </div>

                  {/* Explanation */}
                  {showExplanation && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <div className={cn(
                        "p-4 rounded-2xl mb-6",
                        quizQuestions[currentQuestion].options[selectedAnswer!].correct
                          ? "bg-emerald-500/10 border border-emerald-500/30"
                          : "bg-amber-500/10 border border-amber-500/30"
                      )}>
                        <p className="text-sm">
                          <span className="font-semibold">
                            {quizQuestions[currentQuestion].options[selectedAnswer!].correct ? "✓ Correct! " : "✗ Not quite. "}
                          </span>
                          {quizQuestions[currentQuestion].explanation}
                        </p>
                      </div>

                      <Button
                        onClick={nextQuestion}
                        className="w-full bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-400 hover:to-violet-500 text-white"
                      >
                        {currentQuestion < quizQuestions.length - 1 ? "Next Question" : "See Results"}
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Guide Mode */}
        {viewMode === "guide" && (
          <>
            {/* Back button and Header */}
            <div className="mb-12">
              <button
                onClick={backToChoose}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm font-medium mb-8"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Learn
              </button>

              <div className="text-center">
                <div className="inline-flex items-center gap-2 glass-card px-5 py-2.5 rounded-full text-sm font-medium mb-6">
                  <ScrollText className="w-4 h-4 text-cyan-500" />
                  <span className="text-foreground/80">Privacy Guide</span>
                </div>

                <h1 className="text-3xl md:text-4xl font-display font-bold mb-4">
                  Understanding Crypto
                  <br />
                  <span className="text-gradient-vibrant">Surveillance & Privacy</span>
                </h1>

                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Learn why privacy matters, how transactions can be traced,
                  and practical tips to protect your financial privacy.
                </p>
              </div>
            </div>

        {/* Section 1: The Problem */}
        <section className="mb-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 rounded-2xl bg-rose-500/10 text-rose-500">
              <Eye className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-display font-bold">The Reality of Blockchain Surveillance</h2>
          </div>

          <div className="glass-card p-8 rounded-3xl mb-8">
            <p className="text-lg text-muted-foreground mb-6">
              Every transaction on public blockchains like Solana or Ethereum is permanently recorded and visible to anyone.
              This creates a complete, permanent history of your financial activity.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                { icon: Search, title: "Blockchain Analytics", desc: "Companies like Chainalysis and Elliptic use sophisticated algorithms to trace funds, cluster wallets, and deanonymize users, often selling this data to governments and corporations." },
                { icon: Link2, title: "Wallet Clustering", desc: "When you send from multiple addresses in one transaction, those addresses become \"clustered\" and linked to your identity forever." },
                { icon: Fingerprint, title: "Exchange KYC Leaks", desc: "Once you link a wallet to an exchange, your entire transaction history becomes attributable to your real identity." },
                { icon: TrendingUp, title: "On-Chain Forensics", desc: "Transaction timing, amounts, and patterns can reveal sensitive information about your income, spending habits, and business relationships." },
              ].map((item, i) => (
                <div
                  key={item.title}
                  className="p-5 rounded-2xl bg-rose-500/5 border border-rose-500/20"
                >
                  <div className="flex items-center gap-3 mb-3">
                    <item.icon className="w-5 h-5 text-rose-400" />
                    <h3 className="font-semibold text-rose-400">{item.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-6 rounded-2xl bg-amber-500/5 border border-amber-500/20">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-1" />
              <div>
                <h3 className="font-semibold text-amber-500 mb-2">Real-World Impact</h3>
                <p className="text-sm text-muted-foreground">
                  Your employer can see exactly how much you have, what you buy, and where you send money.
                  Your clients can see all your other clients. Your landlord can see your entire financial history.
                  This isn't hypothetical, it's the default state of public blockchains.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 2: Why Privacy Matters */}
        <section className="mb-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 rounded-2xl bg-violet-500/10 text-violet-500">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-display font-bold">Why Privacy Matters</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Users, title: "Personal Safety", desc: "Visible wealth makes you a target. Privacy protects you and your family from criminals who scan the blockchain for high-value wallets." },
              { icon: Building2, title: "Business Confidentiality", desc: "Competitors can analyze your on-chain activity to discover your pricing, clients, suppliers, and business strategy." },
              { icon: Lock, title: "Financial Freedom", desc: "True financial privacy is a fundamental right. Your spending habits, income, and savings shouldn't be public knowledge." },
            ].map((item, i) => (
              <div
                key={item.title}
                className="glass-card p-6 rounded-3xl"
              >
                <item.icon className="w-8 h-8 text-violet-400 mb-4" />
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Section 3: Practical Privacy Tips (OpSec) */}
        <section className="mb-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 rounded-2xl bg-teal-500/10 text-teal-500">
              <Lightbulb className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-display font-bold">Practical Privacy Tips (OpSec)</h2>
          </div>

          <p className="text-muted-foreground mb-8">
            Even with privacy tools, your behavior matters. Here are practical operational security (OpSec)
            tips to maximize your privacy.
          </p>

          {/* Timing */}
          <div className="glass-card p-8 rounded-3xl mb-6">
            <div className="flex items-center gap-3 mb-6">
              <Clock className="w-6 h-6 text-teal-500" />
              <h3 className="text-xl font-display font-semibold">Timing Matters</h3>
            </div>

            <div className="space-y-4">
              {[
                { good: true, title: "Wait 24-48 hours before withdrawing", desc: "If you withdraw immediately after receiving funds, timing analysis can link your transactions. Add delay to break the temporal connection." },
                { good: true, title: "Don't deposit right before payroll", desc: "As an employer, deposit funds to your treasury days in advance. Immediate deposit→pay patterns are easy to trace." },
                { good: true, title: "Vary your transaction times", desc: "Don't always transact at the same time of day. Patterns make you identifiable." },
                { good: false, title: "Avoid: Instant in-and-out", desc: "Receiving 1000 USDC and immediately withdrawing 1000 USDC is the easiest pattern to detect." },
              ].map((item, i) => (
                <div
                  key={item.title}
                  className={cn(
                    "flex items-start gap-4 p-4 rounded-2xl",
                    item.good ? "bg-background/50" : "bg-rose-500/5 border border-rose-500/20"
                  )}
                >
                  {item.good ? (
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={cn("font-medium mb-1", !item.good && "text-rose-400")}>{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Amounts */}
          <div className="glass-card p-8 rounded-3xl mb-6">
            <div className="flex items-center gap-3 mb-6">
              <Shuffle className="w-6 h-6 text-teal-500" />
              <h3 className="text-xl font-display font-semibold">Amount Obfuscation</h3>
            </div>

            <div className="space-y-4">
              {[
                { good: true, title: "Withdraw different amounts than received", desc: "If you receive 5000 USDC, don't withdraw exactly 5000 USDC. Split it up or leave a residual balance." },
                { good: true, title: "Split large withdrawals", desc: "Instead of one large withdrawal, consider multiple smaller ones over time." },
                { good: true, title: "Keep a residual balance", desc: "Don't always empty your wallet completely. A small remaining balance makes exact amount matching harder." },
                { good: false, title: "Avoid: Exact amount matching", desc: "In → 3000 USDC, Out → 3000 USDC is trivially linkable. Break the pattern." },
              ].map((item, i) => (
                <div
                  key={item.title}
                  className={cn(
                    "flex items-start gap-4 p-4 rounded-2xl",
                    item.good ? "bg-background/50" : "bg-rose-500/5 border border-rose-500/20"
                  )}
                >
                  {item.good ? (
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={cn("font-medium mb-1", !item.good && "text-rose-400")}>{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>

          </div>

          {/* Address Hygiene */}
          <div className="glass-card p-8 rounded-3xl mb-6">
            <div className="flex items-center gap-3 mb-6">
              <Globe className="w-6 h-6 text-teal-500" />
              <h3 className="text-xl font-display font-semibold">Address Hygiene</h3>
            </div>

            <div className="space-y-4">
              {[
                { good: true, title: "Use different addresses for different purposes", desc: "Keep separate wallets for salary, savings, trading, and public activities. Never consolidate unnecessarily." },
                { good: true, title: "Never publicly link addresses", desc: "Don't tweet your wallet address, put it in your bio, or use ENS domains for private wallets." },
                { good: false, title: "Avoid: Consolidation transactions", desc: "Sending from multiple addresses to one \"main\" wallet clusters all those addresses together forever." },
              ].map((item, i) => (
                <div
                  key={item.title}
                  className={cn(
                    "flex items-start gap-4 p-4 rounded-2xl",
                    item.good ? "bg-background/50" : "bg-rose-500/5 border border-rose-500/20"
                  )}
                >
                  {item.good ? (
                    <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <p className={cn("font-medium mb-1", !item.good && "text-rose-400")}>{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Behavioral OpSec */}
          <div className="glass-card p-8 rounded-3xl">
            <div className="flex items-center gap-3 mb-6">
              <Database className="w-6 h-6 text-teal-500" />
              <h3 className="text-xl font-display font-semibold">Behavioral OpSec</h3>
            </div>

            <div className="space-y-4">
              {[
                { good: true, title: "Use a VPN or Tor", desc: "Your IP address can be linked to your transactions by RPC providers and block explorers. Use privacy tools." },
                { good: true, title: "Don't discuss transactions publicly", desc: "\"Just got paid!\" tweets with timestamps make timing analysis trivial." },
                { good: true, title: "Be patient", desc: "Privacy requires patience. Rushing through transactions is the #1 way people compromise their privacy." },
              ].map((item, i) => (
                <div
                  key={item.title}
                  className="flex items-start gap-4 p-4 rounded-2xl bg-background/50"
                >
                  <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium mb-1">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Section 4: How Privacy Tools Help */}
        <section className="mb-20">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-display font-bold">How Privacy Tools Help</h2>
          </div>

          <div className="glass-card p-8 rounded-3xl">
            <p className="text-muted-foreground mb-8">
              Privacy protocols like zero-knowledge proofs, mixing pools, and stealth addresses
              provide the cryptographic foundation for financial privacy. But technology alone isn't enough,
              combining tools with good OpSec creates real privacy.
            </p>

            <div className="grid md:grid-cols-2 gap-6">
              {[
                { title: "Zero-Knowledge Proofs", desc: "Prove you have funds without revealing amounts or transaction history. The foundation of private transfers." },
                { title: "Privacy Pools", desc: "Funds are pooled together, breaking the link between depositor and withdrawer. The larger the pool, the better the anonymity set." },
                { title: "Stealth Addresses", desc: "One-time addresses generated for each transaction. The recipient can spend, but observers can't link payments to a single identity." },
                { title: "Derived Wallets", desc: "Deterministic wallets derived from your main wallet signature. Self-custody without exposing your main address." },
              ].map((item, i) => (
                <div
                  key={item.title}
                  className="p-5 rounded-2xl bg-teal-500/5 border border-teal-500/20"
                >
                  <h3 className="font-semibold text-teal-400 mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Quiz CTA Banner */}
        <section className="mb-20">
          <div className="glass-card p-8 rounded-3xl bg-gradient-to-br from-violet-500/10 to-violet-500/5 border-violet-500/20">
            <div className="flex flex-col md:flex-row items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-violet-500/20 flex items-center justify-center shrink-0">
                <Trophy className="w-10 h-10 text-violet-400" />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h3 className="text-xl font-display font-bold mb-2">Ready to Test Your Knowledge?</h3>
                <p className="text-muted-foreground">
                  Take our {quizQuestions.length}-question quiz to see how well you understand privacy best practices.
                </p>
              </div>
              <Button
                onClick={startQuiz}
                className="bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-400 hover:to-violet-500 text-white px-6 py-3 shrink-0"
              >
                <GraduationCap className="w-5 h-5 mr-2" />
                Take the Quiz
              </Button>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center py-16">
          <h2 className="text-2xl font-display font-bold mb-4">Ready to Take Control of Your Privacy?</h2>
          <p className="text-muted-foreground mb-8">
            Start using privacy-preserving payments today.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-amber-950 px-8 py-4 rounded-2xl font-semibold transition-all duration-300 shadow-xl shadow-amber-500/30 hover:shadow-amber-500/50"
          >
            Launch StealthPay
          </Link>
        </section>
          </>
        )}

        {/* Footer - Always visible */}
        <footer className="text-center py-8 border-t border-white/10 mt-8">
          <p className="text-sm text-muted-foreground">
            This educational content is provided for informational purposes.
            Privacy tools should be used responsibly and in compliance with applicable laws.
          </p>
        </footer>
      </main>
    </div>
  );
}
