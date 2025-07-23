// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-05-15',
  devtools: { enabled: true },
  modules: ['@nuxt/eslint', '@nuxtjs/tailwindcss'],
  css: ['~/assets/css/main.css'],
  nitro: {
    devProxy: {
      '/api': {
        target: process.env.QUEUE_SERVICE_URL || 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
        ws: true
      }
    }
  },
  runtimeConfig: {
    public: {
      queueServiceUrl: process.env.QUEUE_SERVICE_URL || 'http://localhost:3001',
      wsUrl: process.env.WS_URL || 'ws://localhost:3001/ws'
    }
  }
})
