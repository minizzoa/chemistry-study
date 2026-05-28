import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Vercel: '/' (루트 서빙), GitHub Pages gh-pages 패키지: './'
  base: process.env.GITHUB_PAGES === 'true' ? './' : '/',
})
