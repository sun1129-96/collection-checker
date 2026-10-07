import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Viteの設定: ReactとTailwind CSSプラグインを有効化
export default defineConfig({
  plugins: [react(), tailwindcss()],
})

