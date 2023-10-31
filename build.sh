#!/bin/bash

bunx conc --kill-others \
    "\
    esbuild \
    src/tests.ts \
    --bundle \
    --format=iife \
    --global-name=hiper \
    --sourcemap=linked \
    --asset-names=[dir]/[name] \
    --entry-names=[dir]/[name] \
    --outdir=out \
    --legal-comments=inline \
    --watch \
    " \
    "\
    cpx \"src/**/*.{html,png,jpg,json,css,ico}\" out \
    --watch \
    " \
    "\
    wds \
    --root-dir=out \
    --app-index=out/index.html \
    --debug \
    --watch \
    "

# bun build as esbuild alternative
#  "bun build \
#     src/runtime/runtime.ts \
#     --sourcemap external \
#     --asset-naming=[dir]/[name].[ext] \
#     --entry-naming=[dir]/[name].[ext] \
#     --outdir=out/runtime \
#     --watch" \
