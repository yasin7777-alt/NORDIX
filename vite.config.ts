import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'nordix-academy-directory-index',
      apply: 'serve',
      configureServer(server) {
        // In Vite dev, a public subdirectory URL is otherwise handled by
        // the root SPA fallback instead of the built Academy entry point.
        server.middlewares.use((req, _res, next) => {
          if (req.url === '/NORDIX/academy/' || req.url === '/NORDIX/academy') {
            req.url = '/NORDIX/academy/index.html'
          }
          next()
        })
      },
    },
  ],
  base: '/NORDIX/',
})
