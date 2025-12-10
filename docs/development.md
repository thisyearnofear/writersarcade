# WritArcade Development Guide

**Last Updated:** December 11, 2025
**Status:** Production Ready

## Quick Start

### 1. Local Setup
```bash
# Install dependencies
npm install

# Start dev server (uses turbopack)
npm run dev

# Opens:
# Web app: http://localhost:3000/
# Mini-app: http://localhost:3000/mini-app
```

### 2. Quick Testing (5 minutes)

**Basic Game Generation:**
1. Navigate to generator, paste any Paragraph.xyz URL
2. Click "Create Game" (no customization) → Verify 4 options parse correctly

**Customization Testing:**
1. Select Genre = "Horror", connect wallet, generate custom game
2. Verify horror-themed content and article context integration

**Visual Identity:**
- Games now generate with Venice AI cover art (requires API key)
- Hero images display on game pages with genre-specific styling
- Compact success modal navigates to game page (no new tabs)

**Error Handling:**
- Test offline/network errors → Should show red banner (no alert dialogs)
- Auto-retry mechanism triggers after 2 seconds

### 2. Environment Configuration
```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/writarcade"

# AI Services
OPENAI_API_KEY="sk-..."           # OpenAI for game generation
ANTHROPIC_API_KEY="sk-..."        # Claude for advanced prompting
VENICE_API_KEY="..."              # Venice AI for image generation

# Blockchain
BASE_RPC_URL="https://mainnet.base.org"    # Base mainnet RPC
STORY_RPC_URL="https://aeneid.storyrpc.io" # Story testnet RPC
STORY_WALLET_KEY="0x..."          # Private key for Story transactions
PINATA_JWT="pina_..."             # Pinata JWT for IPFS uploads

# Wallet Integration
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID="..." # WalletConnect project ID

# Feature Flags
STORY_IP_REGISTRATION_ENABLED="true"  # Enable/disable Story Protocol integration
```

## Project Structure

```
writarcade/
├── app/                     # Next.js app router
│   ├── api/                 # API routes
│   ├── mini-app/            # Farcaster mini-app
│   └── web/                 # Web application
├── components/              # Shared React components
├── domains/                 # Business logic by domain
│   ├── games/               # Game generation and management
│   ├── assets/              # Asset creation and marketplace
│   └── payments/            # Payment processing
├── lib/                     # Shared utilities and services
├── contracts/               # Smart contracts
├── prisma/                  # Database schema and migrations
├── public/                  # Static assets
└── scripts/                 # Deployment and utility scripts
```

## Development Workflow

### 1. Branching Strategy
- `main` - Production code
- `develop` - Staging environment
- `feature/*` - New features
- `hotfix/*` - Emergency fixes

### 2. Code Quality
```bash
# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format

# Run tests
npm run test
```

### 3. Database Management
```bash
# Generate Prisma client
npm run db:generate

# Push schema changes to database
npm run db:push

# Run migrations
npm run db:migrate

# Seed database
npm run db:seed
```

## API Endpoints

### Game Generation
```
POST /api/games/generate
{
  "articleUrl": "https://paragraph.xyz/@fredwilson/on-openai",
  "genre": "horror",
  "difficulty": "hard"
}

Response:
{
  "id": "uuid",
  "title": "Generated Game Title",
  "options": [...],
  "coverArt": "ipfs://..."
}
```

### Game Management
```
GET /api/games/my-games
GET /api/games/[id]
PUT /api/games/[id]/visibility
DELETE /api/games/[id]
```

### NFT Minting
```
POST /api/games/[id]/mint
{
  "recipient": "0x..."
}

Response:
{
  "transactionHash": "0x...",
  "nftId": "123"
}
```

### IP Registration (Story Protocol)
```
POST /api/assets/[id]/register
{
  "creatorWallet": "0x..."
}

Response:
{
  "storyIpId": "0x...",
  "transactionHash": "0x..."
}
```

## Smart Contracts

### Deployment
```bash
# Deploy to Base Sepolia testnet
npm run deploy:testnet

# Deploy to Base mainnet
npm run deploy:mainnet
```

### Contracts
1. `WriterCoinPayment.sol` - Handles writer coin payments
2. `GameNFT.sol` - Mints games as NFTs
3. `StoryIPAuthor.sol` - Manages IP registration on Story Protocol

## Testing

### Unit Tests
```bash
npm run test:unit
```

### Integration Tests
```bash
npm run test:integration
```

### End-to-End Tests
```bash
npm run test:e2e
```

## Deployment

### Vercel Deployment
- Automatically deploys from `main` branch
- Preview deployments for pull requests
- Environment variables managed in Vercel dashboard

### Smart Contract Deployment
```bash
# Deploy contracts
npm run deploy:contracts

# Verify contracts
npm run verify:contracts
```

## Troubleshooting

### Common Issues

**"Module not found" errors**
- Run `npm install` to ensure all dependencies are installed
- Check that all imports use correct paths

**Database connection errors**
- Verify `DATABASE_URL` in `.env.local`
- Ensure PostgreSQL is running locally
- Check that database user has proper permissions

**Wallet connection issues**
- Verify WalletConnect project ID is set
- Check that wallet provider supports the required networks
- Ensure user has sufficient funds for transactions

**AI generation failures**
- Verify API keys are set correctly
- Check rate limits on AI providers
- Ensure article URLs are accessible

### Debugging Tips

1. Check browser console for frontend errors
2. Check terminal output for backend errors
3. Use Prisma Studio to inspect database: `npm run db:studio`
4. Enable debug logging with `DEBUG=*` environment variable
5. Use Postman or curl to test API endpoints directly

## Contributing

### Code Standards
- Follow existing code style and patterns
- Write TypeScript with strict type checking
- Include unit tests for new functionality
- Document public APIs and complex logic
- Keep pull requests focused on single features

### Pull Request Process
1. Create feature branch from `develop`
2. Implement changes with tests
3. Update documentation if needed
4. Submit pull request to `develop`
5. Address review feedback
6. Merge after approval

## Resources

- **Farcaster Mini-App Docs**: https://docs.farcaster.xyz/mini-apps
- **Story Protocol Docs**: https://docs.story.foundation/
- **Base Documentation**: https://docs.base.org/
- **OpenAI API**: https://platform.openai.com/docs/
- **Viem Documentation**: https://viem.sh/