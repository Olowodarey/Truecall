# ⚽ TrueCall

> Decentralized Football Prediction Platform on Celo

TrueCall is an on-chain prediction platform on **Celo** where verified creators can host football prediction events. Users predict match outcomes, compete for prizes, and build their on-chain reputation. All powered by smart contracts with Twitter-verified creator accounts.

---

## 🎮 How It Works

1. **Connect Wallet** → Celo Mainnet
2. **Link Twitter** → Get verified on-chain
3. **Create Events** → Verified creators pay 1 CELO to create 5-match prediction events
4. **Join & Predict** → Users join events and predict match outcomes
5. **AI Oracle** → Automated result submission when matches complete
6. **Win Prizes** → Top predictors share the prize pool

---

## ✨ Key Features

- **Twitter-Verified Creators** — Only verified Twitter accounts can create events
- **On-Chain Events** — All events and predictions stored on Celo blockchain
- **Creator Events** — Custom 5-match prediction challenges
- **Real-Time Updates** — Live match data and results
- **Transparent Results** — Oracle-verified outcomes on-chain
- **Event Status Management** — Auto-completion when all matches verified

---

## 🏗️ Tech Stack

| Layer          | Technology                             |
| -------------- | -------------------------------------- |
| **Blockchain** | Celo (Mainnet)                         |
| **Contracts**  | Solidity (OpenZeppelin Upgradeable)    |
| **Frontend**   | Next.js 14 + TailwindCSS + shadcn/ui   |
| **Backend**    | NestJS + TypeORM + PostgreSQL          |
| **Wallet**     | wagmi + viem + RainbowKit              |
| **Oracle**     | AI Agent (Automated Result Submission) |
| **Auth**       | Twitter OAuth 2.0                      |

---

## 📦 Project Structure

```
Truecall/
├── contracts/           # Solidity smart contracts
│   └── EVM-contract/   # CreatorEventManager contract
├── backend/            # NestJS API server
├── frontend/           # Next.js web application
└── ai-agent/           # Automated result submission agent
```

---

## 🚀 Deployment

**Quick Start**: See [DEPLOY_README.md](./DEPLOY_README.md)

### Deployed Addresses

**Celo Mainnet**:

- **Contract**: `0x8A18Da2A173b3951c797a438102345cF92838880`
- **Celoscan**: https://celoscan.io/address/0x8A18Da2A173b3951c797a438102345cF92838880
- **Creation Fee**: 1 CELO

### Deployment Guides

| Guide                                                        | Purpose                             |
| ------------------------------------------------------------ | ----------------------------------- |
| [DEPLOY_README.md](./DEPLOY_README.md)                       | 📖 Start here - overview and links  |
| [QUICK_START.md](./QUICK_START.md)                           | ⚡ 30-minute deployment walkthrough |
| [RAILWAY_DEPLOYMENT_GUIDE.md](./RAILWAY_DEPLOYMENT_GUIDE.md) | 🚂 Complete Railway backend setup   |
| [DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)         | ✅ Pre-launch testing checklist     |
| [TWITTER_OAUTH_UPDATE.md](./TWITTER_OAUTH_UPDATE.md)         | 🐦 Twitter Developer Portal setup   |
| [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)                   | 🔧 Common issues and solutions      |

---

## 🛠️ Local Development

### Prerequisites

- Node.js 18+
- PostgreSQL
- Celo wallet with testnet/mainnet funds

### Setup

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd Truecall
   ```

2. **Backend Setup**

   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm run db:setup
   npm run start:dev
   ```

3. **Frontend Setup**

   ```bash
   cd frontend
   npm install
   cp .env.local.example .env.local
   # Edit .env.local with your configuration
   npm run dev
   ```

4. **AI Agent Setup** (Optional)
   ```bash
   cd ai-agent
   npm install
   cp .env.example .env
   # Edit .env with your configuration
   npm run build
   npm start
   ```

---

## 🎯 Features

### For Creators

- ✅ Twitter verification required
- ✅ Create custom 5-match events
- ✅ Choose matches from available fixtures
- ✅ Set event details (name, description, prize)
- ✅ Pay 1 CELO creation fee

### For Users

- ✅ Browse and search events
- ✅ Join multiple events
- ✅ Make predictions on match outcomes
- ✅ View real-time results
- ✅ Track leaderboard rankings
- ✅ Claim prizes for winning predictions

### Event Lifecycle

1. **OPEN** → Creator creates event, users can join and predict
2. **IN_PROGRESS** → Matches are being played
3. **COMPLETED** → All matches verified, winners determined

---

## 📱 Smart Contract Features

- **Upgradeable** → UUPS proxy pattern for future improvements
- **Access Control** → Role-based permissions (admin, verified creators)
- **Event Management** → Create, join, predict lifecycle
- **Result Submission** → Oracle-verified match results
- **Winner Calculation** → Automatic scoring and winner determination
- **Prize Distribution** → On-chain prize pool management
- **Twitter Verification** → On-chain verification status

---

## 🔐 Security

- OpenZeppelin upgradeable contracts
- Role-based access control
- Twitter OAuth 2.0 authentication
- Secure environment variable management
- PostgreSQL for sensitive user data
- Admin-only result submission

---

## 📊 Current Status

- ✅ **Contract**: Deployed to Celo Mainnet
- ✅ **Frontend**: Deployed to Vercel
- 🔄 **Backend**: Ready for Railway deployment
- 🔄 **Database**: PostgreSQL ready
- 📝 **Test Data**: Using JSON match data for initial testing
- 🔜 **Football API**: Integration planned after testing

---

## 🤝 Contributing

This is currently a closed project for testing. After public launch, contribution guidelines will be added.

---

## 📄 License

[Add your license here]

---

## 📞 Support

For deployment issues, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

**Predict. Compete. Win. All on-chain. ⚽🏆**
