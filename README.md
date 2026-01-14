# 🔒 StealthPay

**Private Payroll on Solana**

> Payroll where salaries stay confidential. Forever.

---

## 🎯 Problem

On-chain payroll is **completely public**. When a company pays employees in crypto:

- ❌ Everyone sees who earns what
- ❌ Competitors analyze your cost structure
- ❌ Employees compare salaries causing internal conflicts
- ❌ High earners get targeted by scammers

## 💡 Solution

StealthPay uses **Privacy Cash** to execute payroll with hidden amounts and recipients using zero-knowledge proofs.

```
Employer deposits 50,000 USDC
        ↓
   Privacy Pool (ZK-protected)
        ↓
  ┌─────┼─────┬─────┐
  ↓     ↓     ↓     ↓
Alice  Bob  Carol  Dave
(???)  (???) (???)  (???)

On-chain: Only total deposit visible
Individual payments: INVISIBLE
```

## ✨ Features

- **Employee Management** - Add, edit, remove employees with encrypted data
- **Private Payroll** - Execute batch payments privately via Privacy Cash
- **Dashboard** - Track treasury, payroll history, next payment dates
- **Multi-token** - USDC, USDT, SOL support
- **Wallet Auth** - Sign In With Solana (no passwords)

## 🛠️ Tech Stack

- **Frontend**: Next.js 14, TypeScript, TailwindCSS, shadcn/ui
- **Backend**: Next.js API Routes with Prisma ORM
- **Database**: PostgreSQL (Supabase)
- **Privacy**: Privacy Cash SDK
- **Blockchain**: Solana, @solana/web3.js
- **RPC**: Helius (enhanced performance)

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/Kenbak/stealth-pay.git
cd stealth-pay

# Install
npm install

# Setup environment
cp .env.example .env
# Edit .env with your values

# Database
npx prisma db push

# Run
npm run dev
```

## 📁 Project Structure

```
stealth-pay/
├── src/
│   ├── app/                 # Next.js app router
│   │   ├── (dashboard)/     # Protected dashboard pages
│   │   │   ├── dashboard/   # Main dashboard
│   │   │   ├── employees/   # Employee management
│   │   │   ├── payroll/     # Payroll execution
│   │   │   └── treasury/    # Fund management
│   │   └── api/             # API routes
│   ├── components/          # React components
│   ├── hooks/               # Custom React hooks
│   └── lib/                 # Utilities & services
├── prisma/                  # Database schema
└── public/                  # Static assets
```

## 🔐 Security

- **Wallet-based authentication** - No passwords stored
- **AES-256-GCM encryption** - All sensitive data encrypted at rest
- **Rate limiting** - Protection against abuse
- **Audit logging** - Track all critical actions
- **Zero-knowledge proofs** - Privacy Cash ensures payment unlinkability

## 🌐 Environment Variables

```bash
# Database
DATABASE_URL="postgresql://..."

# Encryption
MASTER_ENCRYPTION_KEY="your-64-char-hex-key"
JWT_SECRET="your-secret"

# Solana
NEXT_PUBLIC_SOLANA_NETWORK="devnet"
NEXT_PUBLIC_HELIUS_API_KEY="your-helius-key"
HELIUS_API_KEY="your-helius-key"
```

## 📖 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/challenge` | POST | Get auth challenge |
| `/api/auth/verify` | POST | Verify wallet signature |
| `/api/organizations` | GET/POST | Manage organization |
| `/api/employees` | GET/POST | List/create employees |
| `/api/employees/[id]` | PATCH/DELETE | Update/delete employee |
| `/api/payrolls` | GET/POST | List/create payrolls |
| `/api/payrolls/[id]/execute` | POST | Execute payroll |
| `/api/prices` | GET | Get token prices |

## 🔗 Links

- [Privacy Cash](https://github.com/Privacy-Cash/privacy-cash)
- [Solana Web3.js](https://solana-labs.github.io/solana-web3.js/)
- [Helius](https://www.helius.dev/)

## 📄 License

MIT

---

Built with 🔒 for privacy-first payroll
