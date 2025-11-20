import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // IMPORTANT: This base path must match your GitHub repository name.
  // Since your repo is 'Project', we set this to '/Project/'.
  // If you rename the repo, update this value.
  base: '/Project/',
});