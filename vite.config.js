import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages serves this repository under /FDE-HuaKe/ rather than /.
  base: '/FDE-HuaKe/',
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
    // Windows can lock generated images while a build replaces them. These
    // outputs are not source files and must not crash the development watcher.
    watch: { ignored: ['**/.codex-build/**', '**/.qa/**', '**/.npm-cache/**'] },
  },
});
