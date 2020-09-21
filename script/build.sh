#!/bin/bash
PKG=`pwd`
ROOT="$PKG/../.."
echo "Using '$PKG' as package root."

# ESLint must run from the root
pushd "$ROOT"
yarn eslint "$PKG/src"
popd

# prepare the /dist folder
mkdir -p "$PKG/dist"
rm -rf "$PKG/dist"/*

# build the targets
yarn tsc --project "$PKG/config/tsconfig.cjs.json"
yarn tsc --project "$PKG/config/tsconfig.mjs.json"

# convert modules
pushd "$PKG/dist/mjs/"
node "$ROOT/script/esnext.cjs"
