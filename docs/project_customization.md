# PROJECT CUSTOMIZATION RULES

This file stores all project-specific, non-global requests and rules for the EDUCORE Directory Management System.

**Important**: Cursor reads this file first before templates; its rules override general templates.

## Project-Specific Rules

### 1. Technology Stack
- **Language**: JavaScript (ES6) only — no TypeScript
- **Architecture**: Onion Architecture (layered, separation of concerns)
- **Frontend**: React + Tailwind CSS only
- **Backend**: Node.js + Express
- **Database**: PostgreSQL (Supabase)
- **Deployment**: Frontend → Vercel, Backend → Railway, Database → Supabase

### 2. Environment Variables & Secrets
- **CRITICAL**: Do not create or store a local `.env` file
- All environment variables and secrets must be entered manually by the developer into hosting dashboards
- Orchestrator will instruct where and how to set them but must never generate, persist, or fetch real secrets or tokens
- Required secrets locations:
  - Vercel dashboard: Frontend environment variables
  - Railway dashboard: Backend environment variables
  - Supabase dashboard: Database connection strings and keys

### 3. Authentication
- Current implementation: Dummy login system for testing only
- Future: Authentication will be handled by separate AUTH SERVICE microservice
- Dummy authentication uses email/password from CSV file
- No real JWT or security tokens in current phase

### 4. OAuth Integrations
- **LinkedIn**: Fully functional OAuth including Sign In with LinkedIn using OpenID Connect
- **GitHub**: Fully functional OAuth2
- Both must have mock data fallback in `/mockData/index.json`

### 4.1 Gemini AI Integration (ONE TIME ONLY - First Login)
- **CRITICAL**: Gemini AI API is a very important external integration for displaying data in profile
- **Purpose**: Generate professional bio and project summaries from LinkedIn/GitHub raw data (ONE-TIME INITIAL SETUP)
- **Integration Points** (ONE TIME ONLY):
  - After LinkedIn OAuth (first login only): Generate bio from LinkedIn profile data
  - After GitHub OAuth (first login only): Generate project summaries from GitHub repositories
  - **No Re-enrichment**: Changes in LinkedIn/GitHub do NOT trigger re-generation. Profile remains as generated from initial login.
- **One-Time Setup**: LinkedIn/GitHub connection page is shown ONLY ONCE during first login. Once completed, users CANNOT reconnect or re-sync accounts.
- **Requirement**: Ensure no view or flow omits Gemini's contribution
- **All profiles must display**: AI-generated bio and AI-generated project summaries (generated once, displayed permanently)
- **Lock**: After enrichment is complete, profile is locked. No re-connection or re-sync is allowed.
- **Fallback**: Mock AI-generated content from `/mockData/index.json`
- **API Key**: `GEMINI_API_KEY` stored in Railway dashboard (not in .env)

### 5. CSV Upload & Error Handling
- Allow partial upload with warnings
- Display flagged items in user-friendly UI form
- Require company to provide or correct missing/invalid information
- Keep temporary internal state for partially uploaded data
- Error messages must indicate exactly which row and column in CSV has the issue

### 6. Multi-Tenancy
- Each company has isolated directory
- All queries must be filtered by `company_id`
- Row-level security policies in PostgreSQL
- Application-level tenant isolation checks

### 7. Role Combinations
- Users can have multiple roles simultaneously
- Managers are not a separate role type; they are existing employees (EMPLOYEE or TRAINER) with a managerial role
- Role types: REGULAR_EMPLOYEE, TRAINER, TEAM_MANAGER, DEPARTMENT_MANAGER, DECISION_MAKER

### 8. Sample Data
- Use provided CSV: `mockData/lotus_tech_hub_sample_company.csv`
- Generate 10-20 sample employees covering all role combinations during development/testing

### 9. Feature Organization
- Each feature has dedicated files
- No two features share a file
- Shared utilities under `/core` or `/shared` only
- Maintain `features-map.json` for feature → file list

### 10. Mock Data Fallback
- Any call to external microservices must have mock data as fallback
- Mock data stored in `/mockData/index.json`
- Prevents exposure of real credentials or unauthorized data

### 11. Security & Compliance
- All sensitive data encrypted at rest and in transit
- Audit logs for all critical actions
- GDPR compliance: explicit consent tracking, data deletion capability
- PII minimization: only store necessary personal data
- Data retention policies: configurable retention period

### 12. Repository Structure
- Monorepo with folders: `frontend/`, `backend/`, `database/`
- All documentation under `docs/`
- Mock data under `mockData/`

### 13. Styling
- **Tailwind CSS only** — no other CSS frameworks or custom CSS files
- All styling must use Tailwind utility classes

### 14. API Request/Response Format
- **CRITICAL**: All request bodies and responses must use stringified JSON in the exact structure:
  - Request: `{ "requester_service": "...", "payload": {...} }`
  - Response: `{ "requester_service": "...", "response": {...} }`
- All request bodies must be sent as `JSON.stringify()` of the above structure
- All responses must be parsed from stringified JSON
- Frontend must stringify request body before sending
- Backend must parse stringified request body
- Backend must stringify response before sending
- Frontend must parse stringified response

### 14. API Design
- Internal endpoints: Directory microservice has multiple internal endpoints; not exposed externally
- Single public endpoint: accepts service/client id + JSON request; dynamically generates SQL through AI-assisted prompt
- External API fallback: on failure, load mock data from `/mockData/index.json`
- Global URLs stored in config.js

---

## Notes
- This file should only store project-specific logic
- Do not duplicate general behavior from templates
- Enables re-running templates while preserving all project-specific tweaks

