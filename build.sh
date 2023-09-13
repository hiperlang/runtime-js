#!/bin/bash

bunx conc --kill-others \
    "esbuild \
    src/runtime/tests.ts \
    --bundle \
    --format=iife \
    --global-name=hyper \
    --sourcemap=linked \
    --asset-names=[dir]/[name] \
    --entry-names=[dir]/[name] \
    --outdir=out/runtime \
    --legal-comments=inline \
    --watch" \
    \
    "cpx \"src/**/*.{html,png,jpg,json}\" out \
    --watch" \
    \
    "wds \
    --root-dir=out \
    --app-index=out/runtime/index.html \
    --watch" \
    \

#  "bun build \
#     src/runtime/runtime.ts \
#     --sourcemap external \
#     --asset-naming=[dir]/[name].[ext] \
#     --entry-naming=[dir]/[name].[ext] \
#     --outdir=out/runtime \
#     --watch" \

# bunx postcss src/**/*.css --dir build/ --watch