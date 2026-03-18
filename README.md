# Mantle Ark AI

### Bring Everything In. Protect It Forever.

> When AI Meets Mantle — Built for the Mantle Squad Bounty Program

**Mantle Ark AI** is an AI-powered tool that scans your crypto assets across every chain, shows you why Mantle is the best home for your portfolio, and protects your wealth with an on-chain inheritance vault — so your family is never left with nothing.

---

## The Problem

Crypto users face two invisible problems that nobody is solving:

1. **Asset Fragmentation** — The average user has assets scattered across 5-8 chains (Ethereum, Arbitrum, Solana, Base, etc.). No single tool gives a full picture, and managing everything is expensive and inefficient.

2. **Zero Inheritance Planning** — If a crypto holder passes away or loses access, their assets are gone forever. Billions of dollars in crypto are lost every year because there is no plan. Traditional finance has wills and estate planning. Crypto has nothing.

**Target Users:**
- Crypto holders with assets on multiple chains
- DeFi users paying high gas fees on L1
- Anyone who wants their family to inherit their crypto
- Users looking for better yields on Mantle

---

## The Solution

Mantle Ark AI combines three tools into one seamless experience:

### 1. Universal Chain Scanner
Paste any RPC endpoint + wallet address. AI auto-detects the chain type and scans your assets.

- **EVM chains**: Ethereum, Mantle, Arbitrum, Optimism, Base, BNB, Polygon, Avalanche
- **Non-EVM**: Solana, Sui, Aptos
- **Custom**: Any chain with a JSON-RPC or REST endpoint
- **Auto-scan**: Connect wallet and 8 popular chains are scanned in parallel automatically

### 2. AI Migration Advisor
AI analyzes your cross-chain portfolio and generates a personalized migration plan to Mantle.

- **Gas comparison**: How much you save per transaction on Mantle
- **Yield comparison**: APY differences between your current chains and Mantle DeFi (Agni, FusionX, Lendle, mETH)
- **Bridge routes**: Recommended bridges per chain (Wormhole, LayerZero, Official Bridge)
- **Break-even analysis**: How many days until migration cost pays for itself
- **Step-by-step plan**: AI generates actionable migration instructions

### 3. Ark Vault — On-chain Inheritance Protocol
A dead man's switch smart contract deployed on Mantle that protects your assets for your family.

- **Beneficiaries**: Add wallet addresses with name and percentage allocation
- **Dead Man's Switch**: Configurable inactivity period (30-365 days)
- **Grace Period**: Time to cancel if triggered accidentally (7-60 days)
- **Heartbeat**: Prove you're alive with any Mantle transaction or manual call
- **Pre-distribution**: Auto-exit DeFi, revoke approvals, convert to stablecoins
- **Family Report**: AI generates a human-readable report for beneficiaries

---

## Mantle Integration

Mantle Ark AI is deeply integrated with the Mantle ecosystem:

| Integration | Description |
|---|---|
| **Mantle Network** | Primary chain for Ark Vault deployment (Chain ID 5000) |
| **MNT Gas Token** | Ultra-low gas costs make heartbeat transactions nearly free |
| **Mantle DeFi** | AI references Agni, FusionX, Lendle, mETH for yield comparisons |
| **Mantle Explorer** | Routescan API for detailed on-chain data (txns, tokens, gas) |
| **Smart Contract** | ArkVault.sol designed and optimized for Mantle |
| **Migration Target** | The tool actively promotes consolidation to Mantle with data-backed reasons |

---

## Smart Contract: ArkVault.sol

The inheritance vault is a real Solidity contract (`contracts/ArkVault.sol`) with the following functions:

| Function | Description |
|---|---|
| `heartbeat()` | Owner proves they are alive, resets the timer |
| `addBeneficiary()` | Add a beneficiary with wallet, name, and percentage |
| `triggerSwitch()` | Anyone can trigger after inactivity period passes |
| `executeInheritance()` | Distributes funds to beneficiaries after grace period |
| `emergencyWithdraw()` | Owner can withdraw all funds before execution |
| `getStatus()` | Returns vault status: ACTIVE, CAN_TRIGGER, GRACE_PERIOD, EXECUTED |

Key design decisions:
- Minimum 7 days inactivity period (prevents accidental triggers)
- Minimum 1 day grace period (safety net)
- Percentage allocation in basis points (100 = 1%) for precision
- Owner retains full control until execution
- No admin keys, no centralized authority

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | Node.js + Express.js |
| **AI Engine** | Groq SDK (Llama 3.3 70B Versatile) |
| **Blockchain** | ethers.js v6 + custom JSON-RPC queries |
| **Frontend** | Vanilla HTML/CSS/JS + Chart.js |
| **Smart Contract** | Solidity ^0.8.20 |
| **Chain Detection** | EVM (eth_chainId), Solana (getBalance), Sui (suix_getBalance), Aptos (REST) |
| **Explorer API** | Routescan (Etherscan-compatible) for Mantle on-chain data |

---

## Getting Started

### Prerequisites
- Node.js v18+
- A Groq API key (free at [console.groq.com](https://console.groq.com))
- MetaMask browser extension (for wallet features)

### Installation

```bash
git clone https://github.com/user/mantle-ark-ai.git
cd mantle-ark-ai
npm install
```

### Configuration

Create a `.env` file:

```
GROQ_API_KEY=your_groq_api_key_here
PORT=3000
```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## How It Works

```
┌─────────────────────────────────────────────────────┐
│  1. CONNECT                                         │
│     User connects MetaMask wallet                   │
│     App auto-scans 8 popular EVM chains             │
│     Results appear live in Dashboard                 │
├─────────────────────────────────────────────────────┤
│  2. SCAN                                            │
│     Add more chains via custom RPC (Solana, Sui...) │
│     AI auto-detects chain type from RPC response    │
│     Portfolio aggregated across all chains           │
├─────────────────────────────────────────────────────┤
│  3. MIGRATE                                         │
│     AI compares gas, yield, and risk vs Mantle      │
│     Generates personalized migration plan           │
│     Shows bridge routes and break-even analysis     │
├─────────────────────────────────────────────────────┤
│  4. PROTECT                                         │
│     4-step wizard: Beneficiaries → Trigger →        │
│     Preferences → Review & Deploy                   │
│     Ark Vault smart contract deployed on Mantle     │
│     Dead man's switch monitors wallet activity      │
├─────────────────────────────────────────────────────┤
│  5. INHERIT                                         │
│     If owner inactive → switch triggers             │
│     Grace period → owner can cancel                 │
│     After grace → vault auto-distributes to family  │
└─────────────────────────────────────────────────────┘
```

---

## How AI Was Used

| Area | AI Role | Human Role |
|---|---|---|
| **Chain Detection** | Auto-detect chain type from RPC response patterns | Designed the detection logic and fallback order |
| **Portfolio Analysis** | Generate migration comparison and savings estimate | Defined what metrics matter and how to present them |
| **Migration Plan** | Write step-by-step migration instructions | Chose bridge routes and DeFi protocols to reference |
| **Inheritance Report** | Generate family-readable report for beneficiaries | Designed the report structure and tone |
| **Chat Assistant** | Answer questions about Mantle, DeFi, and migration | Crafted system prompts and knowledge base |
| **Smart Contract** | Not used — contract written by hand | Full design, security considerations, and testing |
| **UI/UX Design** | Not used | All visual design, layout, and interaction decisions |

> AI is a tool, not the author. Every architectural decision, product vision, and design choice was made by a human. AI accelerated execution.

---

## Project Structure

```
mantle-ark-ai/
├── server.js                    # Express server entry point
├── package.json                 # Dependencies
├── .env                         # Environment variables
├── routes/
│   ├── ai.js                   # AI analysis + migration + chat endpoints
│   ├── scanner.js              # Universal chain scanner (EVM + non-EVM)
│   └── inheritance.js          # Inheritance vault AI planner + cost estimator
├── public/
│   ├── index.html              # Single-page app with 5 sections
│   ├── css/
│   │   └── style.css           # Dark theme, glassmorphism, animations
│   └── js/
│       ├── app.js              # Navigation, charts, portfolio stats
│       ├── wallet.js           # MetaMask connection + auto-scan trigger
│       ├── scanner.js          # Chain scanner UI + auto-scan logic
│       ├── migration.js        # AI migration advisor UI
│       ├── inheritance.js      # 4-step vault wizard UI
│       ├── ai.js               # AI chat assistant
│       └── particles.js        # Canvas particle background
└── contracts/
    └── ArkVault.sol            # Solidity inheritance vault for Mantle
```

---

## Future Vision

If developed further, Mantle Ark AI could include:

- **ERC-20 Token Scanning** — Detect all token balances, not just native tokens
- **Real-time Price Feeds** — Live USD pricing via oracles or CoinGecko API
- **Multi-sig Vault** — Require multiple beneficiaries to confirm before execution
- **NFT Inheritance** — Include NFTs in the vault distribution
- **Notification System** — Email/Telegram alerts when switch is triggered
- **Vault Dashboard** — Real-time monitoring of vault status, heartbeat history
- **Cross-chain Execution** — Auto-bridge assets from other chains to Mantle before distribution
- **Mobile App** — Heartbeat via mobile push notification

---

## Screenshots

> Screenshots of the live application

| Section | Description |
|---|---|
| **Hero** | Landing page with animated particles and feature cards |
| **Scanner** | Universal chain scanner with auto-detect progress bar |
| **Dashboard** | Portfolio overview with donut chart and chain breakdown |
| **Migration** | AI migration report with comparison table |
| **Ark Vault** | 4-step inheritance wizard with AI-generated review |
| **AI Chat** | Conversational assistant for Mantle and DeFi questions |

---

## License

MIT

---

**Built for the Mantle ecosystem. Built for the people who matter most to you.**
