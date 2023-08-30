#!/bin/bash

bunx conc --kill-others \
    "esbuild \
    src/runtime/runtime.ts \
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
    --watch" \
    \
    
# bunx postcss src/**/*.css --dir build/ --watch