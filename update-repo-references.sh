#!/bin/bash

# Update Repository References After Rename
# Run this script AFTER renaming webgpu-webllm-app to cora on Gitea

set -e

echo "🔄 Updating repository references from webgpu-webllm-app to cora..."

# Update git remote URL
echo "📡 Updating git remote URL..."
git remote set-url origin https://git.oe74.net/adelorenzo/cora.git

# Update README.md
echo "📝 Updating README.md..."
sed -i '' 's|git.oe74.net/adelorenzo/webgpu-webllm-app|git.oe74.net/adelorenzo/cora|g' README.md

# Update documentation files
echo "📄 Updating documentation..."
find . -name "*.md" -not -path "./.git/*" -exec sed -i '' 's|git.oe74.net/adelorenzo/webgpu-webllm-app|git.oe74.net/adelorenzo/cora|g' {} \;

# Update test files (remove hardcoded paths)
echo "🧪 Updating test files..."
find web/tests -name "*.js" -exec sed -i '' 's|/Users/adelorenzo/Documents/repos/webgpu-webllm-app/web|./web|g' {} \;

# Test git remote
echo "🔍 Testing git remote..."
git remote -v

echo "✅ Repository references updated successfully!"
echo ""
echo "Next steps:"
echo "1. Test git operations: git fetch"
echo "2. Push changes: git push origin develop"
echo "3. Verify CI/CD pipeline at: https://git.oe74.net/adelorenzo/cora/actions"