#!/bin/bash

echo "🚀 RAK Porcelain RAG Chatbot - Deployment Script"
echo "================================================"

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📦 Initializing Git repository..."
    git init
    git add .
    git commit -m "Initial commit: RAK Porcelain RAG Chatbot"
    echo "✅ Git repository initialized"
else
    echo "✅ Git repository already exists"
fi

# Check if we're connected to GitHub
if ! git remote get-url origin > /dev/null 2>&1; then
    echo ""
    echo "⚠️  No GitHub remote found!"
    echo "Please create a GitHub repository and run:"
    echo "git remote add origin https://github.com/YOUR_USERNAME/rak-porcelain-chatbot.git"
    echo "git branch -M main"
    echo "git push -u origin main"
    echo ""
    echo "Then visit vercel.com to deploy!"
    exit 1
fi

# Build the project
echo ""
echo "🔨 Building project..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build successful"
else
    echo "❌ Build failed"
    exit 1
fi

# Push to GitHub
echo ""
echo "📤 Pushing to GitHub..."
git add .
git commit -m "Deploy: $(date)"
git push origin main

if [ $? -eq 0 ]; then
    echo "✅ Pushed to GitHub successfully"
    echo ""
    echo "🎉 Ready for deployment!"
    echo ""
    echo "Next steps:"
    echo "1. Go to vercel.com"
    echo "2. Import your GitHub repository"
    echo "3. Set environment variables:"
    echo "   - OPENAI_API_KEY"
    echo "   - SUPABASE_URL"
    echo "   - SUPABASE_SERVICE_ROLE_KEY"
    echo "   - SUPABASE_ANON_KEY"
    echo "4. Deploy!"
    echo ""
    echo "Your app will be live at: https://your-app.vercel.app"
else
    echo "❌ Failed to push to GitHub"
    exit 1
fi
