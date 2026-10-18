import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'super-admin-api-dev-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (req.url && req.url.startsWith('/api/super-admin')) {
              try {
                const { default: handler } = await import('./api/super-admin.ts');
                const anyRes = res as any;
                if (!anyRes.status) {
                  anyRes.status = function (code: number) {
                    anyRes.statusCode = code;
                    return anyRes;
                  };
                }
                if (!anyRes.json) {
                  anyRes.json = function (data: any) {
                    anyRes.setHeader('Content-Type', 'application/json');
                    anyRes.end(JSON.stringify(data));
                    return anyRes;
                  };
                }
                await handler(req, anyRes);
                return;
              } catch (e: any) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: e?.message || 'Server error' }));
                return;
              }
            }
            next();
          });
        },
      },
    ],
    resolve: {
      alias: {
        '@': typeof import.meta.dirname !== 'undefined' ? import.meta.dirname : path.resolve('.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
