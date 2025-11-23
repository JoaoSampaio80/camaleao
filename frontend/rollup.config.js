import { defineConfig } from 'rollup';
import wasm from '@rollup/wasm-node';

export default defineConfig({
  plugins: [wasm()],
});
