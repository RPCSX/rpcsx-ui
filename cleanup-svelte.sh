#!/bin/bash

# Script to clean up Svelte files after React conversion
# Run this only after verifying all React components work correctly

echo "This script will delete all .svelte files and svelte-related configuration."
echo "Make sure you have tested the React components first!"
echo ""
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cleanup cancelled."
    exit 1
fi

echo "Removing .svelte files..."
find . -name "*.svelte" -type f -delete

echo "Removing svelte.config.js..."
rm -f svelte.config.js

echo "Removing Svelte-specific dependencies..."
npm uninstall @sveltejs/adapter-static @sveltejs/kit @sveltejs/vite-plugin-svelte svelte

echo "Cleanup complete!"
echo ""
echo "Don't forget to:"
echo "1. Update any remaining imports that reference .svelte files to .tsx"
echo "2. Test that the build system works correctly"
echo "3. Update the rpcsx-ui-kit build system if needed"
