#!/bin/bash

cat >build/protobuf/package.json <<!EOF
{
    "main": "index.js",
    "types": "index.d.ts",
    "module": "index.mjs"
}
!EOF
