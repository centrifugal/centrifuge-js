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
          'build/cjs/transport_*.d.ts',
          'build/esm/transport_*.d.ts',
          'build/cjs/protobuf.codec.d.ts',
          'build/esm/protobuf.codec.d.ts',
          'build/cjs/json.d.ts',
          'build/cjs/utils.d.ts',
          'build/esm/json.d.ts',
          'build/esm/utils.d.ts',
        ],
        hook: 'writeBundle'
      }),
    ],
    output: [
      {
        file: 'build/cjs/protobuf.js',
        format: 'cjs',
      },
      {
        file: 'build/esm/protobuf.js',
        format: 'es',
      }
    ]
  }
];
