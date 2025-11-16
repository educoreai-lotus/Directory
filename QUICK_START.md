# QUICK START - Deployment Checklist

Use this checklist to quickly deploy the EDUCORE Directory Management System.

## ✅ Pre-Deployment Checklist

- [ ] GitHub account created
- [ ] Vercel account created (can use GitHub login)
- [ ] Railway account created (can use GitHub login)
- [ ] Supabase account created
- [ ] Git installed locally
- [ ] Node.js 18+ installed locally

---

## 🚀 Quick Deployment Steps

### 1. GitHub Setup (5 minutes)

```bash
# Run the setup script
chmod +x scripts/setup-git.sh
./scripts/setup-git.sh

# Then manually:
# 1. Create GitHub repo at github.com
# 2. Run: git remote add origin https://github.com/YOUR_USERNAME/educore-directory-system.git
# 3. Run: git push -u origin main
```

### 2. Supabase Setup (10 minutes)

1. Create project at [supabase.com](https://supabase.com)
2. Copy credentials (URL, keys)
3. Run SQL from `database/schema.sql` in Supabase SQL Editor
4. Verify tables created

### 3. Vercel Deployment (5 minutes)

1. Import GitHub repo in Vercel
2. Set root directory: `frontend`
3. Add environment variable: `REACT_APP_API_BASE_URL` (set after Railway)
4. Deploy

### 4. Railway Deployment (10 minutes)

1. Create project from GitHub repo
2. Set root directory: `backend`
3. Add all environment variables (see DEPLOYMENT.md)
4. Generate public domain
5. Update Vercel `REACT_APP_API_BASE_URL` with Railway URL

### 5. Verify (5 minutes)

- [ ] Frontend loads at Vercel URL
- [ ] Backend health check works: `/health`
- [ ] Database tables exist in Supabase
- [ ] No errors in deployment logs

---

## 📋 Environment Variables Reference

### Vercel (Frontend)
```
REACT_APP_API_BASE_URL=https://your-app.railway.app/api/v1
```

### Railway (Backend)
```
PORT=3001
NODE_ENV=production
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_PASSWORD=your_password
LINKEDIN_CLIENT_ID=...
LINKEDIN_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GEMINI_API_KEY=...
```

### Supabase
- Get from: Settings → API
- URL, anon key, service_role key

---

## 🔗 Useful Links

- **Full Deployment Guide**: See `DEPLOYMENT.md`
- **GitHub**: https://github.com
- **Vercel**: https://vercel.com
- **Railway**: https://railway.app
- **Supabase**: https://supabase.com

---

## ⚠️ Important Notes

1. **Never commit `.env` files** - All secrets go in platform dashboards
2. **Database password** - Save it securely, you'll need it for Railway
3. **API keys** - Get OAuth keys from LinkedIn/GitHub developer portals
4. **Gemini API** - Get from Google AI Studio (https://makersuite.google.com/app/apikey)

---

## 🆘 Need Help?

1. Check `DEPLOYMENT.md` for detailed instructions
2. Review platform-specific documentation
3. Check deployment logs in each platform
4. Verify all environment variables are set correctly

