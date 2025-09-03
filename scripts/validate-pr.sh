#!/bin/bash

# PR Validation Script
# Ensures CHANGELOG.md and PROJECT_MEMORY.md are updated when required

set -e

echo "🔍 Validating PR requirements..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get list of changed files
CHANGED_FILES=$(git diff --name-only HEAD~1)

# Flags to track what's changed
CODE_CHANGED=false
CHANGELOG_UPDATED=false
PROJECT_MEMORY_UPDATED=false
FEATURE_ADDED=false
BREAKING_CHANGE=false

# Check what types of files changed
for file in $CHANGED_FILES; do
  # Check for code changes
  if [[ $file == *.ts || $file == *.tsx || $file == *.js || $file == *.jsx ]]; then
    CODE_CHANGED=true
  fi
  
  # Check for feature additions
  if [[ $file == */routes/* || $file == */services/* || $file == */components/* ]]; then
    # Look for new files (not in previous commit)
    if ! git show HEAD~1:"$file" &>/dev/null; then
      FEATURE_ADDED=true
    fi
  fi
  
  # Check if CHANGELOG was updated
  if [[ $file == "CHANGELOG.md" ]]; then
    CHANGELOG_UPDATED=true
  fi
  
  # Check if PROJECT_MEMORY was updated
  if [[ $file == "PROJECT_MEMORY.md" ]]; then
    PROJECT_MEMORY_UPDATED=true
  fi
done

# Check commit message for breaking changes
COMMIT_MSG=$(git log -1 --pretty=%B)
if [[ $COMMIT_MSG == *"BREAKING"* ]] || [[ $COMMIT_MSG == *"!"* ]]; then
  BREAKING_CHANGE=true
fi

# Validation rules
VALIDATION_PASSED=true
VALIDATION_MESSAGES=()

# Rule 1: Code changes require CHANGELOG update
if [ "$CODE_CHANGED" = true ] && [ "$CHANGELOG_UPDATED" = false ]; then
  VALIDATION_MESSAGES+=("❌ Code changed but CHANGELOG.md not updated")
  VALIDATION_PASSED=false
fi

# Rule 2: New features require PROJECT_MEMORY update
if [ "$FEATURE_ADDED" = true ] && [ "$PROJECT_MEMORY_UPDATED" = false ]; then
  VALIDATION_MESSAGES+=("❌ New feature added but PROJECT_MEMORY.md not updated")
  VALIDATION_PASSED=false
fi

# Rule 3: Breaking changes require both updates
if [ "$BREAKING_CHANGE" = true ]; then
  if [ "$CHANGELOG_UPDATED" = false ]; then
    VALIDATION_MESSAGES+=("❌ Breaking change but CHANGELOG.md not updated")
    VALIDATION_PASSED=false
  fi
  if [ "$PROJECT_MEMORY_UPDATED" = false ]; then
    VALIDATION_MESSAGES+=("❌ Breaking change but PROJECT_MEMORY.md not updated")
    VALIDATION_PASSED=false
  fi
fi

# Check for console.log statements (warning only)
if grep -r "console\.log" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . 2>/dev/null | grep -v "// eslint-disable\|// @ts-ignore\|test\|spec" > /dev/null; then
  VALIDATION_MESSAGES+=("⚠️  console.log statements found (remove before merging)")
fi

# Check for TODO comments (info only)
TODO_COUNT=$(grep -r "TODO\|FIXME\|HACK" --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" . 2>/dev/null | wc -l || echo 0)
if [ "$TODO_COUNT" -gt 0 ]; then
  VALIDATION_MESSAGES+=("ℹ️  $TODO_COUNT TODO/FIXME/HACK comments found")
fi

# Output results
echo ""
echo "📊 PR Validation Report"
echo "========================"
echo ""

if [ "$CODE_CHANGED" = true ]; then
  echo "✓ Code files changed"
fi

if [ "$CHANGELOG_UPDATED" = true ]; then
  echo -e "${GREEN}✓ CHANGELOG.md updated${NC}"
else
  echo -e "${YELLOW}○ CHANGELOG.md not updated${NC}"
fi

if [ "$PROJECT_MEMORY_UPDATED" = true ]; then
  echo -e "${GREEN}✓ PROJECT_MEMORY.md updated${NC}"
else
  echo -e "${YELLOW}○ PROJECT_MEMORY.md not updated${NC}"
fi

echo ""

# Output validation messages
if [ ${#VALIDATION_MESSAGES[@]} -gt 0 ]; then
  echo "📋 Validation Messages:"
  for msg in "${VALIDATION_MESSAGES[@]}"; do
    echo "  $msg"
  done
  echo ""
fi

# Final result
if [ "$VALIDATION_PASSED" = true ]; then
  echo -e "${GREEN}✅ PR validation passed!${NC}"
  exit 0
else
  echo -e "${RED}❌ PR validation failed!${NC}"
  echo ""
  echo "Please ensure:"
  echo "  1. CHANGELOG.md is updated with your changes"
  echo "  2. PROJECT_MEMORY.md is updated for new features"
  echo "  3. Remove any debugging console.log statements"
  echo ""
  echo "To update these files:"
  echo "  git add CHANGELOG.md PROJECT_MEMORY.md"
  echo "  git commit --amend"
  exit 1
fi