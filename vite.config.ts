import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { execSync } from 'node:child_process'

function getVersion(): string {
  if (process.env.APP_VERSION) return process.env.APP_VERSION.slice(0, 7)
  try {
    return execSync('git rev-parse --short HEAD').toString().trim()
  } catch {
    return 'dev'
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.BASE_URL ?? '/',
  define: {
    __APP_VERSION__: JSON.stringify(getVersion()),
  },
})
