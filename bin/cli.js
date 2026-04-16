#!/usr/bin/env node
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcPath = path.resolve(__dirname, '../src/index.ts');
const loaderPath = path.resolve(__dirname, '../node_modules/ts-node/esm.mjs');

const child = spawn('node', ['--no-warnings', '--loader', loaderPath, srcPath, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, NODE_OPTIONS: '--no-warnings' }
});

child.on('exit', (code) => {
  process.exit(code);
});
