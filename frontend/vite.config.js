import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },

      "/auth": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },

      "/find-player": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },

      "/age-group": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },

      "/skill-level": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },

      "/sport-category": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },

      "/chat": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },

      "/community": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },
      "/user-post": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        secure: false,
        timeout: 600000,
        proxyTimeout: 600000,
      },

      "/equipment": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },
      "/hashtags": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        secure: false,
      },
      "/edit-user-post": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        secure: false,
      },
      "/delete-user-post": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
        secure: false,
      },

      "/profile": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },
      "/uploads": {
        target: "http://127.0.0.1:5000",
        changeOrigin: true,
      },



      
    }
  }
})