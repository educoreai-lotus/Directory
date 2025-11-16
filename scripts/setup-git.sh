#!/bin/bash

# Git Setup Script
# Run this to initialize git and prepare for GitHub push

echo "🔧 Setting up Git repository..."
echo ""

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Git is not installed. Please install Git first."
    exit 1
fi

# Initialize git if not already initialized
if [ ! -d ".git" ]; then
    echo "📦 Initializing Git repository..."
    git init
    echo "✅ Git repository initialized"
else
    echo "✅ Git repository already initialized"
fi

# Add all files
echo "📝 Adding files to Git..."
git add .

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo "ℹ️  No changes to commit"
else
    echo "💾 Creating initial commit..."
    git commit -m "Initial commit: Foundation setup with dark emerald design system"
    echo "✅ Initial commit created"
fi

echo ""
echo "✅ Git setup complete!"
echo ""
echo "📝 Next Steps:"
echo "   1. Create a GitHub repository"
echo "   2. Run: git remote add origin https://github.com/YOUR_USERNAME/educore-directory-system.git"
echo "   3. Run: git branch -M main"
echo "   4. Run: git push -u origin main"

