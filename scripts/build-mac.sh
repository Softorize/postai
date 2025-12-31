#!/bin/bash

# Build PostAI macOS application
# This script builds the complete application including Python and frontend

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "=========================================="
echo "Building PostAI for macOS"
echo "=========================================="

# Step 1: Build Python distribution
echo ""
echo "Step 1: Building Python distribution..."
"$SCRIPT_DIR/build-python.sh"

# Step 2: Install npm dependencies
echo ""
echo "Step 2: Installing npm dependencies..."
cd "$PROJECT_ROOT"
npm install

# Step 3: Build frontend
echo ""
echo "Step 3: Building frontend..."
npm run build:frontend

# Step 4: Build Electron app
echo ""
echo "Step 4: Building Electron app..."
npm run electron:build

# Done
echo ""
echo "=========================================="
echo "Build complete!"
echo "Output: $PROJECT_ROOT/release"
echo "=========================================="

# List output files
ls -la "$PROJECT_ROOT/release" 2>/dev/null || echo "Release directory not found"
