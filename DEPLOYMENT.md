# 🚀 RAK Porcelain RAG Chatbot - Deployment Guide

## Quick Deploy to Vercel (Recommended)

### Prerequisites
- GitHub account
- Vercel account (free at vercel.com)
- Supabase project (already configured)
- OpenAI API key (already configured)

### Step 1: Push to GitHub

1. **Initialize Git repository:**
   ```bash
   cd "/Volumes/Harshad Pro/Development/RAK AI"
   git init
   git add .
   git commit -m "Initial commit: RAK Porcelain RAG Chatbot"
   ```

2. **Create GitHub repository:**
   - Go to github.com
   - Click "New repository"
   - Name: `rak-porcelain-chatbot`
   - Make it public
   - Don't initialize with README

3. **Push to GitHub:**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/rak-porcelain-chatbot.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Deploy to Vercel

1. **Go to Vercel:**
   - Visit vercel.com
   - Sign in with GitHub
   - Click "New Project"

2. **Import Repository:**
   - Select your `rak-porcelain-chatbot` repository
   - Vercel will auto-detect it's a monorepo

3. **Configure Build Settings:**
   
   **Frontend (Root):**
   - Framework Preset: `Create React App`
   - Root Directory: `frontend`
   - Build Command: `npm run build`
   - Output Directory: `build`

   **Backend (API):**
   - Root Directory: `backend`
   - Build Command: `npm run build`
   - Output Directory: `dist`

4. **Set Environment Variables:**
   
   In Vercel dashboard, go to Settings → Environment Variables:
   
   ```
   OPENAI_API_KEY=sk-your-actual-openai-key-here
   OPENAI_EMBEDDING_MODEL=text-embedding-3-small
   OPENAI_CHAT_MODEL=gpt-4o-mini
   OPENAI_EMBED_DIM=1536
   
   SUPABASE_URL=https://hsltpxdnazzheklqvtmv.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   
   NODE_ENV=production
   FRONTEND_URL=https://your-app.vercel.app
   ```

5. **Deploy:**
   - Click "Deploy"
   - Wait for build to complete
   - Your app will be live at `https://your-app.vercel.app`

## Alternative: Deploy to Railway

### Step 1: Prepare for Railway

1. **Install Railway CLI:**
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway:**
   ```bash
   railway login
   ```

### Step 2: Deploy Backend

1. **Initialize Railway project:**
   ```bash
   cd backend
   railway init
   ```

2. **Set environment variables:**
   ```bash
   railway variables set OPENAI_API_KEY=sk-your-key-here
   railway variables set SUPABASE_URL=https://hsltpxdnazzheklqvtmv.supabase.co
   railway variables set SUPABASE_SERVICE_ROLE_KEY=your-service-key
   railway variables set NODE_ENV=production
   ```

3. **Deploy:**
   ```bash
   railway up
   ```

### Step 3: Deploy Frontend

1. **Deploy to Vercel or Netlify:**
   - Follow Vercel steps above
   - Update `REACT_APP_API_URL` to your Railway backend URL

## Alternative: Deploy to Render

### Step 1: Backend on Render

1. **Create new Web Service:**
   - Connect GitHub repository
   - Root Directory: `backend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`

2. **Set environment variables:**
   - Add all the same variables as above

### Step 2: Frontend on Render

1. **Create new Static Site:**
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `build`

## Post-Deployment Checklist

### ✅ Verify Deployment

1. **Test Health Endpoints:**
   - `https://your-app.vercel.app/health`
   - `https://your-app.vercel.app/health/db`

2. **Test Chat Functionality:**
   - Send a test message
   - Verify RAG responses
   - Check provenance formatting

3. **Test CORS:**
   - Ensure frontend can communicate with backend
   - Check browser console for errors

### ✅ Security Checklist

1. **Environment Variables:**
   - ✅ All sensitive keys are in environment variables
   - ✅ No hardcoded secrets in code
   - ✅ Service role key is backend-only

2. **CORS Configuration:**
   - ✅ Only allow your frontend domain
   - ✅ No wildcard origins in production

3. **Rate Limiting:**
   - Consider adding rate limiting for production
   - Monitor API usage

### ✅ Performance Optimization

1. **Frontend:**
   - ✅ Build is optimized for production
   - ✅ Images are compressed
   - ✅ CSS is minified

2. **Backend:**
   - ✅ Database queries are optimized
   - ✅ Embeddings are cached
   - ✅ Error handling is robust

## Monitoring & Maintenance

### Health Monitoring

1. **Set up uptime monitoring:**
   - Use UptimeRobot or similar
   - Monitor `/health` endpoint

2. **Error tracking:**
   - Consider Sentry for error tracking
   - Monitor OpenAI API usage

3. **Database monitoring:**
   - Monitor Supabase usage
   - Check embedding storage

### Updates & Maintenance

1. **Code updates:**
   - Push to GitHub
   - Vercel auto-deploys

2. **Database updates:**
   - Run migrations in Supabase
   - Update embeddings as needed

3. **Environment variables:**
   - Update in Vercel dashboard
   - Redeploy if needed

## Troubleshooting

### Common Issues

1. **CORS Errors:**
   - Check `FRONTEND_URL` environment variable
   - Verify CORS configuration

2. **Database Connection:**
   - Verify Supabase credentials
   - Check database health endpoint

3. **OpenAI API Errors:**
   - Verify API key is correct
   - Check usage limits

4. **Build Failures:**
   - Check build logs in Vercel
   - Verify all dependencies are installed

### Support

- Check Vercel documentation: vercel.com/docs
- Check Supabase documentation: supabase.com/docs
- Check OpenAI documentation: platform.openai.com/docs

## Cost Estimation

### Vercel (Free Tier)
- ✅ Frontend hosting: Free
- ✅ Backend API: Free (100GB bandwidth)
- ✅ Custom domain: Free

### Supabase (Free Tier)
- ✅ Database: Free (500MB)
- ✅ Storage: Free (1GB)
- ✅ API calls: Free (50,000/month)

### OpenAI
- ✅ Embeddings: ~$0.0001 per 1K tokens
- ✅ Chat completions: ~$0.002 per 1K tokens
- ✅ Estimated monthly cost: $5-20

**Total estimated monthly cost: $5-20** 💰
