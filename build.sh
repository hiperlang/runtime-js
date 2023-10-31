#!/bin/bash

bunx conc --kill-others \
    "\
    esbuild \
    src/runtime/tests.ts \
    --bundle \
    --format=iife \
    --global-name=hyper \
    --sourcemap=linked \
    --asset-names=[dir]/[name] \
    --entry-names=[dir]/[name] \
    --outdir=out/runtime \
    --legal-comments=inline \
    --watch \
    "\
    "\
    cpx \"src/**/*.{html,png,jpg,json,css,ico}\" out \
    --watch \
    "\
    "\
    wds \
    --root-dir=out/website \
    --debug \
    --watch \
    "\
    "\
    unocss \
    src/website/index.html \
    --out-file out/website/utilities.css \
    --preflights false \
    --watch \
    "\
    "\
    postcss \
    src/website/main.css \
    --output out/website/main.css \
    --use autoprefixer \
    --autoprefixer \"> 1%, last 5 versions\" \
    --watch \
    "\


# --app-index=out/runtime/index.html \
#  "bun build \
#     src/runtime/runtime.ts \
#     --sourcemap external \
#     --asset-naming=[dir]/[name].[ext] \
#     --entry-naming=[dir]/[name].[ext] \
#     --outdir=out/runtime \
#     --watch" \