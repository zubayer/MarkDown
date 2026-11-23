import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    // The CodeMirror editor is large; this keeps the build log quiet.
    chunkSizeWarningLimit: 800,
  },
});
