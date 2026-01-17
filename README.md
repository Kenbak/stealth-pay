# 🔒 StealthPay

**Private Payroll & Invoicing on Solana**

> Pay salaries and invoices privately. Wallet addresses and amounts stay hidden. Forever.

---

## 🎯 Problem

On-chain payroll is **completely public**. When a company pays employees in crypto:

- ❌ Everyone sees who earns what
- ❌ Employees can see employer's treasury balance
- ❌ Employers can see employee's wallet balance
- ❌ Competitors analyze your cost structure
- ❌ High earners get targeted by scammers

## 💡 Solution

StealthPay provides **complete privacy for both employers and employees**:

| Privacy Feature | Technology |
|-----------------|------------|
| Hidden payment amounts | ShadowWire ZK Proofs |
| Hidden recipient addresses | Derived StealthPay Wallets |
| Private withdrawals | Privacy Cash + ShadowWire |
| Encrypted employee data | AES-256-GCM |

```
┌─────────────────────────────────────────────────────────┐
│                    EMPLOYER                              │
│  Treasury: 50,000 USDC                                  │
│  Employees: Alice, Bob, Carol, Dave                     │
│  (Names encrypted, real wallets NEVER stored)           │
└─────────────────────────────────────────────────────────┘
                         │
                         ▼ ShadowWire ZK Transfer
┌─────────────────────────────────────────────────────────┐
│                  PRIVACY POOL                            │
│  Amounts: ??? (hidden by ZK proofs)                     │
│  Recipients: ??? (hidden by ZK proofs)                  │
└─────────────────────────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
   ┌─────────┐      ┌─────────┐      ┌─────────┐
   │ Alice's │      │  Bob's  │      │ Carol's │
   │StealthPay│     │StealthPay│     │StealthPay│
   │ Wallet  │      │ Wallet  │      │ Wallet  │
   │  (???)  │      │  (???)  │      │  (???)  │
   └─────────┘      └─────────┘      └─────────┘
        │                │                │
        ▼                ▼                ▼
   Privacy Cash     ShadowWire      Direct Transfer
   (Private)        (Private)        (Public)
        │                │                │
        ▼                ▼                ▼
   Personal         Personal          Personal
   Wallet           Wallet            Wallet
```

**Key Innovation:** Employers never see employees' real wallets. Employees never see employer's treasury balance after registration.

## ✨ Features

### For Employers
- **Employee Management** - Add employees with encrypted data, generate invite links
- **Private Payroll** - Batch payments via ShadowWire ZK proofs
- **Treasury Management** - Deposit/withdraw with transaction history
- **Invoice System** - Create invoices, receive private payments
- **Compliance Exports** - CSV/JSON exports for auditing

### For Employees
- **Self-Registration** - Accept invite, derive StealthPay wallet automatically
- **Private Withdrawals** - Choose between Privacy Cash (private) or direct transfer
- **Payment History** - Track received payments with exports
- **Multi-Org Support** - Work for multiple organizations

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, TypeScript, TailwindCSS, shadcn/ui |
| Backend | Next.js API Routes, Prisma ORM |
| Database | PostgreSQL (Supabase) |
| Privacy (Payroll) | [ShadowWire](https://github.com/Radrdotfun/ShadowWire) by Radr Labs |
| Privacy (Withdrawals) | [Privacy Cash SDK](https://github.com/Privacy-Cash/privacy-cash-sdk) |
| RPC | [Helius](https://helius.dev) (enhanced performance + simulation) |
| Blockchain | Solana |

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/yourusername/stealth-payroll.git
cd stealth-payroll

# Install
npm install

# Setup environment
cp .env.example .env
# Edit .env with your values

# Generate Prisma client
npx prisma generate

# Push database schema
npx prisma db push

# Run development server
npm run dev
```

## 📁 Project Structure

```
stealth-payroll/
├── src/
│   ├── app/
│   │   ├── (dashboard)/         # Protected dashboard
│   │   │   ├── dashboard/       # Main dashboard
│   │   │   ├── employees/       # Employee management
│   │   │   ├── payroll/         # Payroll execution
│   │   │   ├── treasury/        # Fund management
│   │   │   ├── invoices/        # Invoice management
│   │   │   ├── my-payments/     # Employee view
│   │   │   └── settings/        # Account settings
│   │   ├── api/                 # API routes
│   │   ├── join/[code]/         # Employee invite acceptance
│   │   └── pay/[publicId]/      # Invoice payment page
│   ├── components/              # React components
│   ├── contexts/                # React contexts (auth)
│   ├── hooks/                   # Custom hooks
│   └── lib/                     # Utilities & services
├── prisma/                      # Database schema
├── docs/                        # Documentation
└── public/                      # Static assets
```

## 🔐 Security & Privacy

| Feature | Implementation |
|---------|---------------|
| Authentication | Wallet-based (Sign-In with Solana) |
| Data Encryption | AES-256-GCM for all sensitive data |
| Payment Privacy | ZK proofs (ShadowWire + Privacy Cash) |
| Recipient Privacy | Derived StealthPay wallets |
| Rate Limiting | Per-IP and per-wallet limits |
| Transaction Simulation | Helius pre-flight checks |

### Privacy Model

```
What employers see:
  ✅ Employee names (encrypted in DB)
  ✅ Salaries (encrypted in DB)
  ✅ StealthPay wallet addresses
  ❌ Employee's REAL wallet
  ❌ Employee's personal balance

What employees see:
  ✅ Their salary
  ✅ Payment history
  ✅ Organization name
  ❌ Other employees' salaries
  ❌ Employer's treasury balance (after registration)

What's on-chain:
  ❌ Individual payment amounts (ZK hidden)
  ❌ Sender-recipient links (ZK hidden)
  ✅ Pool deposits/withdrawals (visible but unlinkable)
```

## 🌐 Environment Variables

```bash
# Database
DATABASE_URL="postgresql://..."

# Encryption
MASTER_ENCRYPTION_KEY="your-64-char-hex-key"
JWT_SECRET="your-jwt-secret"

# Solana
NEXT_PUBLIC_SOLANA_NETWORK="mainnet-beta"  # or "devnet"
NEXT_PUBLIC_HELIUS_API_KEY="your-helius-key"
HELIUS_API_KEY="your-helius-key"
```

## 📖 API Endpoints

### Authentication
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/challenge` | POST | Get signature challenge |
| `/api/auth/verify` | POST | Verify signature, get JWT |
| `/api/me` | GET | Get current user roles |

### Organization
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/organizations` | GET | Get organization |
| `/api/organizations` | POST | Create organization |
| `/api/organizations` | PATCH | Update organization |
| `/api/organizations` | DELETE | Delete organization |

### Employees
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/employees` | GET | List employees |
| `/api/employees` | POST | Create employee (generates invite) |
| `/api/employees/[id]` | PATCH | Update employee |
| `/api/employees/[id]` | DELETE | Delete employee |
| `/api/employees/invite/[code]` | GET | Get invite details |
| `/api/employees/invite/[code]` | POST | Accept invite |

### Payroll
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/payrolls` | GET | List payrolls |
| `/api/payrolls` | POST | Create payroll |
| `/api/payrolls/[id]` | GET | Get payroll details |
| `/api/payrolls/[id]/prepare` | POST | Prepare for execution |
| `/api/payrolls/[id]/execute` | POST | Execute via ShadowWire |

### Invoices
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/invoices` | GET | List invoices |
| `/api/invoices` | POST | Create invoice |
| `/api/invoices/[publicId]` | GET | Get invoice (public) |
| `/api/invoices/[publicId]/pay` | POST | Mark as paid |

### Treasury & Withdrawals
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/treasury/transactions` | GET | Get treasury history |
| `/api/treasury/transactions` | POST | Record transaction |
| `/api/balance` | GET | Get wallet balance |
| `/api/withdraw` | POST | Execute withdrawal |
| `/api/withdrawals` | GET | Get withdrawal history |
| `/api/withdrawals` | POST | Estimate withdrawal fees |



## 🔗 Links

- [ShadowWire SDK](https://github.com/Radrdotfun/ShadowWire)
- [Privacy Cash SDK](https://github.com/Privacy-Cash/privacy-cash-sdk)
- [Radr Labs](https://radr.fun)
- [Helius](https://helius.dev)
- [Solana](https://solana.com)

## 📄 License

MIT

---

Built with 🔒 for privacy-first payroll | Powered by **ShadowWire** + **Privacy Cash**
