#!/usr/bin/env node
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.resolve(__dirname, '../dist/index.js');

// Dynamically import the built entry point
import(distPath).catch((err) => {
  console.error('Error loading calendit. Try reinstalling: npm install -g calendit');
  console.error(err.message);
  process.exit(1);
});
