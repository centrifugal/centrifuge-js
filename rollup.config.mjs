import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import json from '@rollup/plugin-json';
import del from 'rollup-plugin-delete';

export default [
  {
    input: 'src/index.ts',
    plugins: [
      typescript(),
      resolve({
        preferBuiltins: false
      }),
      commonjs(),
      del({
        targets: [
          'build/protobuf.*',
          'build/transport_*.d.ts',
          'build/json.d.ts',
          'build/utils.d.ts',
        ],
        hook: 'writeBundle',
        runOnce: true,
      }),
    ],
    output: [
      {
        file: 'build/index.js',
        format: 'cjs',
      },
      {
        file: 'build/index.mjs',
        format: 'es',
      },
      {
        file: 'build/index.iife.js',
        format: 'iife',
        name: 'centrifugal',
        extend: true,
        intro: 'var self = typeof window !== "undefined" ? window : typeof self !== "undefined" ? self : this;',
      }
    ]
  },
  {
    input: 'src/protobuf.ts',
    plugins: [
      json(),
      typescript(),
      resolve({
        preferBuiltins: false
      }),
      commonjs(),
      del({
        targets: [
          'build/protobuf/protobuf.d.ts',
          'build/protobuf/transport_*.d.ts',
          'build/protobuf/protobuf.codec.d.ts',
          'build/protobuf/json.d.ts',
          'build/protobuf/utils.d.ts',
        ],
        hook: 'writeBundle'
      }),
    ],
    output: [
      {
        file: 'build/protobuf/index.js',
        format: 'cjs',
      },
      {
        file: 'build/protobuf/index.mjs',
        format: 'es',
      },
    ]
  }
];
