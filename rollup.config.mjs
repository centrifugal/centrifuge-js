import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import json from '@rollup/plugin-json';
import del from 'rollup-plugin-delete';

// Configuration for JSON build
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
        ],
        hook: 'writeBundle',
        runOnce: true,
      }),
    ],
    output: [
      {
        file: 'build/index.js',
        format: 'cjs',
        sourcemap: true
      },
      {
        file: 'build/index.mjs',
        format: 'es',
        sourcemap: true
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
          'build/cjs/index.d.ts',
          'build/esm/index.d.ts',
        ],
        hook: 'writeBundle',
        runOnce: true,
      }),
    ],
    output: [
      {
        file: 'build/cjs/protobuf.js',
        format: 'cjs',
        sourcemap: true
      },
      {
        file: 'build/esm/protobuf.js',
        format: 'es',
        sourcemap: true
      }
    ]
  }
];
