# EDUCORE DIRECTORY MANAGEMENT SYSTEM

A multi-tenant Company Directory platform for managing employees, roles, teams, and departments.

## Project Structure

```
DIRECTORY3/
├── frontend/          # React + Tailwind CSS (Vercel)
├── backend/           # Node.js + Express (Railway)
├── database/          # PostgreSQL migrations & seeds (Supabase)
├── docs/              # Documentation
├── mockData/          # Mock data for fallback
└── .github/           # CI/CD workflows
```

## Technology Stack

- **Frontend**: React + Tailwind CSS → Vercel
- **Backend**: Node.js + Express → Railway
- **Database**: PostgreSQL → Supabase
- **CI/CD**: GitHub Actions
- **Language**: JavaScript (ES6) only

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL (or Supabase account)
- GitHub account for CI/CD
- Vercel account (free tier available)
- Railway account (free tier available)
- Supabase account (free tier available)

### Quick Deployment

**🚀 Ready to deploy?** See the deployment guides:

- **`DEPLOYMENT_SUMMARY.md`** - Quick deployment checklist
- **`DEPLOYMENT.md`** - Complete step-by-step guide
- **`QUICK_START.md`** - Quick reference

### Environment Variables

**IMPORTANT**: Do not create local `.env` files. All secrets must be entered manually in hosting dashboards:

- **Vercel**: Frontend environment variables
- **Railway**: Backend environment variables
- **Supabase**: Database connection strings

Required secrets:
- `VERCEL_TOKEN` (for CI/CD)
- `RAILWAY_TOKEN` (for CI/CD)
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `LINKEDIN_CLIENT_ID` (optional for now)
- `LINKEDIN_CLIENT_SECRET` (optional for now)
- `GITHUB_CLIENT_ID` (optional for now)
- `GITHUB_CLIENT_SECRET` (optional for now)
- `GEMINI_API_KEY` (optional for now)

## Development

### Frontend
```bash
cd frontend
npm install
npm start
```

### Backend
```bash
cd backend
npm install
npm start
```

### Database
```bash
cd database
# Run migrations via Supabase CLI or dashboard
```

## Documentation

- `requirements.md` - System requirements
- `flow.md` - User flows
- `architecture.md` - Technical architecture
- `roadmap.json` - Feature roadmap
- `docs/project_customization.md` - Project-specific rules

## License

Proprietary

