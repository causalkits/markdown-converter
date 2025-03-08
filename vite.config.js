import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/markdown-converter/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',  // 恢复 assets 目录
    rollupOptions: {
      input: resolve(__dirname, 'index.html'),
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      }
    },
    minify: 'terser',
    sourcemap: false,
    cssCodeSplit: true
  },
  resolve: {
    extensions: ['.js', '.jsx', '.json']  // 添加文件扩展名解析
  }
})
