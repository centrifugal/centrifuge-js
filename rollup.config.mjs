import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import del from 'rollup-plugin-delete';

// Silence noisy TS9005 declaration-emit warnings from the protobufjs-generated
// client_proto.js — its JSDoc references inner namespaces that TS can't lift
// into a public .d.ts. We don't ship a .d.ts for it anyway (filtered by the
// del plugin below), so the warnings are harmless.
const silenceProtoWarnings = (level, log, handler) => {
  if (log.plugin === 'typescript' && /TS9005|client_proto\.js/.test(log.message || '')) return;
  handler(level, log);
};

export default [
  {
    input: 'src/index.ts',
    onLog: silenceProtoWarnings,
    plugins: [
      typescript({ outDir: 'build' }),
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
    onLog: silenceProtoWarnings,
    plugins: [
      json(),
      typescript({ outDir: 'build/protobuf' }),
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
      }
    ]
  }
];
