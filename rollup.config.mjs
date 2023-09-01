import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from 'rollup-plugin-typescript2';
import json from '@rollup/plugin-json';

// Configuration for JSON build
const mainConfig = {
  input: 'src/index.ts',
  plugins: [
    typescript(),
    resolve({
      preferBuiltins: false
    }),
    commonjs()
  ],
  output: [
    {
      file: 'build/index.js',  // Your CommonJS output file
      format: 'cjs',
      sourcemap: true
    },
    {
      file: 'build/index.mjs',  // Your ESM output file
      format: 'es',
      sourcemap: true
    }
  ]
};

// Configuration for Protobuf build
const protobufConfig = {
  input: 'src/centrifuge-protobuf/index.ts',
  plugins: [
    json(),
    typescript(),
    resolve({
      preferBuiltins: false
    }),
    commonjs(),
  ],
  output: [
    {
      file: 'build/protobuf/index.js',
      format: 'cjs',
      sourcemap: true
    },
    {
      file: 'build/protobuf/index.mjs',
      format: 'es',
      sourcemap: true
    }
  ]
};

export default [mainConfig, protobufConfig];
