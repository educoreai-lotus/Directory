# AWS EC2 Deployment - TODO & Summary

**Branch:** `deployment-amazon`  
**Status:** Deployment files created, ready for testing and EC2 setup  
**Last Updated:** December 9, 2025

---

## ✅ What's Been Completed

### 1. Docker Configuration
- ✅ **Backend Dockerfile** (`backend/Dockerfile`)
  - Node.js 20 production image
  - Production dependencies only
  - Exposes port 3001
  - CMD: `npm start`

- ✅ **Frontend Dockerfile** (`frontend/Dockerfile`)
  - Multi-stage build (Node.js build → nginx serve)
  - Production build with nginx
  - Exposes port 80

- ✅ **Docker ignore files**
  - `backend/.dockerignore`
  - `frontend/.dockerignore`

### 2. Docker Compose Files
- ✅ **docker-compose.local.yaml**
  - Local deployment setup
  - Uses Docker Hub images: `jasminemograby/directory-backend:latest` and `jasminemograby/directory-frontend:latest`
  - Frontend API URL: `http://localhost:8080`
  - Ports: Backend 8080, Frontend 3000

- ✅ **docker-compose.ec2.yaml**
  - EC2 deployment setup
  - Same images from Docker Hub
  - Frontend API URL: `http://backend:3001` (internal Docker network)
  - Ports: Backend 8080, Frontend 3000

### 3. Environment Variable Templates
- ✅ **.env.local.example**
  - Complete list of required backend environment variables
  - Placeholders only (no actual values)
  - Includes: Database, Coordinator, OAuth, AI services

- ✅ **.env.ec2.example**
  - Same structure as local
  - EC2-specific placeholders (IP addresses, domains)

### 4. Documentation
- ✅ **EC2_DEPLOYMENT_INSTRUCTIONS.md**
  - Step-by-step EC2 setup guide
  - Docker installation instructions
  - Manual deployment steps
  - Troubleshooting guide

### 5. GitHub Actions Workflows
- ✅ **.github/workflows/ci.yaml**
  - CI workflow for pull requests (install & test)

- ✅ **.github/workflows/cd-ec2.yaml**
  - CD workflow for automatic deployment
  - Triggers on: `main` and `deployment-amazon` branches
  - Builds images, pushes to Docker Hub, deploys to EC2

---

## ⏳ What Still Needs to Be Done

### 1. Docker Hub Images
- ⏳ **Build and push images to Docker Hub**
  - Backend: `jasminemograby/directory-backend:latest`
  - Frontend: `jasminemograby/directory-frontend:latest`
  
  **Options:**
  - **Option A:** Push manually (after `docker login`):
    ```bash
    docker build -t jasminemograby/directory-backend:latest -f backend/Dockerfile backend
    docker push jasminemograby/directory-backend:latest
    
    docker build -t jasminemograby/directory-frontend:latest -f frontend/Dockerfile frontend
    docker push jasminemograby/directory-frontend:latest
    ```
  
  - **Option B:** Let GitHub Actions handle it (after pushing to `deployment-amazon` branch)

### 2. Local Testing
- ⏳ **Test local deployment**
  1. Copy `.env.local.example` to `.env.local`
  2. Fill in actual environment variables
  3. Run: `docker compose -f docker-compose.local.yaml pull`
  4. Run: `docker compose -f docker-compose.local.yaml up -d`
  5. Verify: Frontend at `http://localhost:3000`, Backend at `http://localhost:8080`

### 3. GitHub Secrets Configuration
- ⏳ **Add GitHub Secrets** (for automatic deployment)
  - Go to: `https://github.com/educoreai-lotus/Directory/settings/secrets/actions`
  - Add:
    - `DOCKER_USERNAME` = `jasminemograby`
    - `DOCKER_PASSWORD` = Your Docker Hub password/token
    - `EC2_HOST` = Your EC2 instance IP or hostname
    - `EC2_SSH_PRIVATE_KEY` = SSH private key for ec2-user

### 4. EC2 Setup
- ⏳ **Manual EC2 deployment** (before automation)
  1. Launch EC2 instance
  2. Install Docker and Docker Compose (see `EC2_DEPLOYMENT_INSTRUCTIONS.md`)
  3. Create `/home/ec2-user/directory` directory
  4. Create `.env` file with actual values
  5. Create `docker-compose.yaml` (copy from `docker-compose.ec2.yaml`)
  6. Configure EC2 Security Group (ports 8080, 3000)
  7. Run: `docker compose pull && docker compose up -d`

### 5. Environment Variables
- ⏳ **Fill in actual values** in:
  - `.env.local` (for local testing)
  - `.env` on EC2 (for production)

  **Required variables:**
  - Database connection (Supabase)
  - Coordinator service URLs and keys
  - OAuth credentials (if using)
  - AI service API keys (if using)

---

## 📋 Quick Reference

### Local Deployment Commands
```bash
# Copy env template
cp .env.local.example .env.local
# Edit .env.local with your values

# Pull and start
docker compose -f docker-compose.local.yaml pull
docker compose -f docker-compose.local.yaml up -d

# View logs
docker compose -f docker-compose.local.yaml logs -f

# Stop
docker compose -f docker-compose.local.yaml down
```

### EC2 Deployment Commands
```bash
# On EC2, after setup:
cd /home/ec2-user/directory
docker compose pull
docker compose up -d
docker ps
```

### Docker Hub Image Tags
- `jasminemograby/directory-backend:latest`
- `jasminemograby/directory-frontend:latest`

---

## 🔑 Important Notes

### Port Configuration
- **Backend:** Internal port 3001, exposed as 8080 on host
- **Frontend:** Internal port 80 (nginx), exposed as 3000 on host

### Network Configuration
- **Local:** Frontend calls backend via `http://localhost:8080`
- **EC2:** Frontend calls backend via `http://backend:3001` (Docker internal network)

### Docker Compose Rules
- ✅ **NO `build:` sections** - All images from Docker Hub only
- ✅ **Uses `.env` files** for sensitive configuration
- ✅ **Shared network:** `directory-net` for service communication

### Branch Safety
- ✅ **Only `deployment-amazon` branch modified**
- ✅ **Main branch untouched**
- ✅ **No application code changes**

---

## 🎯 Next Steps (When Resuming)

1. **Build and push Docker images to Docker Hub**
   - Either manually or via GitHub Actions

2. **Test local deployment**
   - Use `docker-compose.local.yaml`
   - Verify frontend and backend communicate correctly

3. **Set up EC2 instance**
   - Follow `EC2_DEPLOYMENT_INSTRUCTIONS.md`
   - Configure security groups
   - Deploy manually first

4. **Configure GitHub Secrets**
   - Add all required secrets for automated deployment

5. **Test automated deployment**
   - Push to `deployment-amazon` branch
   - Verify GitHub Actions builds and deploys successfully

---

## 📁 File Locations

### Deployment Files
- `docker-compose.local.yaml` - Local deployment
- `docker-compose.ec2.yaml` - EC2 deployment
- `.env.local.example` - Local env template
- `.env.ec2.example` - EC2 env template
- `EC2_DEPLOYMENT_INSTRUCTIONS.md` - EC2 setup guide

### Docker Files
- `backend/Dockerfile` - Backend image definition
- `backend/.dockerignore` - Backend ignore rules
- `frontend/Dockerfile` - Frontend image definition
- `frontend/.dockerignore` - Frontend ignore rules
- `frontend/nginx.conf` - Nginx configuration

### GitHub Actions
- `.github/workflows/ci.yaml` - CI workflow
- `.github/workflows/cd-ec2.yaml` - CD workflow (triggers on `main` and `deployment-amazon`)

---

## ⚠️ Reminders

- **Never modify main branch** - All work in `deployment-amazon` only
- **No application code changes** - Only deployment-related files
- **Docker Hub images required** - Must push images before deployment
- **Environment variables** - Must fill in actual values (not placeholders)
- **EC2 Security Group** - Must allow ports 8080 and 3000
- **GitHub Secrets** - Required for automated deployment

---

**Status:** Ready to resume deployment setup  
**Branch:** `deployment-amazon`  
**All files committed and pushed to GitHub**

