# SoMo - Social Movement

**A collaborative pixel canvas NFT governance platform built on Nervos CKB blockchain**

SoMo is a pixel canvas where users mint individual pixels as NFTs using the Spore Protocol. Each pixel serves as an access pass to governance tokens, creating a unique blockchain-based social experiment in collective ownership and decision-making.

## 🎯 Features

- **50x50 Pixel Canvas**: Interactive "Eternal Land" grid with tiered pricing based on location
- **NFT Minting**: Each pixel is a unique Spore Protocol DOB/0 NFT with embedded traits
- **Governance System**: Original minters earn governance points towards a 350M token airdrop
- **Multi-Wallet Support**: Compatible with JoyID, MetaMask, and UTXOGlobal wallets
- **Real-time Updates**: WebSocket integration for live canvas synchronization
- **Mobile-First Design**: Optimized dark-themed UI for all devices
- **Referral System**: Earn rewards for bringing new participants
- **Admin Dashboard**: Management tools for cluster operations and monitoring

## 🛠️ Tech Stack

### Frontend
- React 18 with TypeScript
- Vite for fast development and building
- TailwindCSS + Shadcn/ui for styling
- TanStack React Query for state management
- Wouter for routing

### Backend
- Node.js with Express
- PostgreSQL database via Drizzle ORM
- WebSocket server for real-time features
- Rate limiting and security middleware

### Blockchain
- Nervos CKB (Layer 1 blockchain)
- Spore Protocol for NFT standard
- CCC SDK (@ckb-ccc/core) for blockchain interactions
- DOB/0 encoding for pixel metadata

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** 18 or higher
- **npm** or **pnpm** package manager
- **PostgreSQL** 14 or higher
- A **Nervos CKB wallet** (JoyID, MetaMask, or UTXOGlobal)

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd somo
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Database

#### Option A: Docker (Recommended)

```bash
docker run -d \
  --name somo-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=somo_db \
  -p 5432:5432 \
  postgres:14
```

#### Option B: Local PostgreSQL

Ensure PostgreSQL is running and create a database:

```bash
createdb somo_db
```

### 4. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Database Connection
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/somo_db

# Server Configuration
NODE_ENV=development
PORT=5000

# Admin Wallet (replace with your CKB address)
ADMIN_WALLET_ADDRESS=ckt1qrfrwcdnvssswdwpn3s9v8fp87emat306ctjwsm3nmlkjg8qyza2cqgqq...

# Production Frontend URL (for CORS)
# FRONTEND_URL=https://yourdomain.com
```

### 5. Initialize Database Schema

```bash
npm run db:push
```

This will create all necessary tables. The application will automatically initialize the 50x50 pixel canvas on first startup.

### 6. Run the Application

#### Development Mode

```bash
npm run dev
```

The application will start on `http://localhost:5000`

#### Production Mode

```bash
# Build the frontend
npm run build

# Start the server
npm run start
```

## 📚 Database Management

### Push Schema Changes

```bash
npm run db:push
```

### Generate Migrations

```bash
npm run db:generate
```

### Force Schema Update (⚠️ May cause data loss)

```bash
npm run db:push --force
```

## 🎮 Usage

### For Users

1. **Connect Wallet**: Click "Connect Wallet" and choose your preferred wallet provider
2. **Mint a Pixel**: Select an available pixel on the canvas and mint it as an NFT
3. **Earn Governance**: Original minters receive governance points based on pixel tier and location
4. **Transfer/Melt**: Manage your pixels through the "My Pixels" page

### For Admins

1. **Admin Access**: The wallet address specified in `ADMIN_WALLET_ADDRESS` has admin privileges
2. **Dashboard**: Access admin features through the hamburger menu
3. **Cluster Management**: Create and manage Spore clusters for pixel minting
4. **Monitoring**: View statistics, user activity, and feedback

## 🏗️ Project Structure

```
somo/
├── client/                 # Frontend React application
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── hooks/         # Custom React hooks
│   │   ├── lib/           # Blockchain and utility functions
│   │   └── contexts/      # React contexts (WebSocket, etc.)
│   └── index.html
├── server/                # Backend Express application
│   ├── features/          # Feature-based API modules
│   │   ├── pixels/       # Pixel management
│   │   ├── users/        # User operations
│   │   ├── governance/   # Governance points
│   │   └── ...
│   ├── db.ts             # Database connection
│   ├── config.ts         # Server configuration
│   └── index.ts          # Entry point
├── shared/               # Shared code between frontend/backend
│   ├── schema.ts         # Database schema (Drizzle)
│   ├── canvas-utils.ts   # Canvas utilities
│   └── constants.ts      # Shared constants
├── package.json
├── vite.config.ts
├── tailwind.config.ts
└── drizzle.config.ts
```

## 🔒 Security

SoMo implements multiple security layers:

- **Rate Limiting**: API and operation-specific limits
- **CORS Protection**: Configured allowed origins
- **Input Validation**: Zod schema validation on all inputs
- **WebSocket Limits**: Connection caps per IP
- **Database Constraints**: Unique constraints and partial indexes
- **BigInt Arithmetic**: Safe large number calculations
- **Admin Authentication**: Wallet signature verification

## 🌐 Deployment

### Environment Variables for Production

Ensure these are set in your production environment:

```env
NODE_ENV=production
DATABASE_URL=<your-production-database-url>
ADMIN_WALLET_ADDRESS=<your-admin-ckb-address>
FRONTEND_URL=https://yourdomain.com
PORT=5000
```

### Recommended Platforms

- **Vercel**: Frontend deployment (build output: `dist/public`)
- **Railway**: Full-stack deployment with PostgreSQL
- **Render**: Combined frontend + backend with managed database
- **DigitalOcean**: VPS deployment with Docker

### Build Command

```bash
npm run build
```

### Start Command

```bash
npm run start
```

## 📊 Governance & Economics

### Pixel Tiers

Pixels are priced based on Manhattan distance from center:

| Tier | Distance | Price (CKB) |
|------|----------|-------------|
| S    | 0-5      | 5,000       |
| A    | 6-10     | 1,500       |
| B    | 11-15    | 800         |
| C    | 16-20    | 400         |
| D    | 21+      | 200         |

### Governance Points

Points are calculated based on:
- Pixel tier (higher tier = more points)
- Founder status (original minter multiplier)
- Locked CKB amount
- Territorial control bonuses

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Resources

- [Nervos CKB Documentation](https://docs.nervos.org/)
- [Spore Protocol](https://docs.spore.pro/)
- [CCC SDK](https://github.com/ckb-devrel/ccc)
- [DOB/0 Standard](https://github.com/sporeprotocol/dob-cookbook)

## 💡 Support

For questions, issues, or feedback:

- reach out on telegram @telmobit

## 🎉 Acknowledgments

Built with support from the Nervos ecosystem and the Spore Protocol community.

---

**Made with ❤️ for the decentralized future**
