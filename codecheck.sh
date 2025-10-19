#!/bin/bash
# Code Quality Check Script
# Run all code quality checks: Prettier, ESLint, and TypeScript

echo "🔍 Running Code Quality Checks..."
echo ""

echo "1️⃣ Checking code formatting with Prettier..."
npx prettier --check .
PRETTIER_EXIT=$?

echo ""
echo "2️⃣ Checking code quality with ESLint..."
npx eslint . --ext .js,.jsx,.ts,.tsx
ESLINT_EXIT=$?

echo ""
echo "3️⃣ Checking TypeScript types..."
npm run check
TYPESCRIPT_EXIT=$?

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

if [ $PRETTIER_EXIT -eq 0 ] && [ $ESLINT_EXIT -eq 0 ] && [ $TYPESCRIPT_EXIT -eq 0 ]; then
  echo "✅ All checks passed!"
  exit 0
else
  echo "❌ Some checks failed. See errors above."
  echo ""
  echo "💡 To auto-fix issues, run:"
  echo "   npx prettier --write . && npx eslint . --ext .js,.jsx,.ts,.tsx --fix"
  exit 1
fi
