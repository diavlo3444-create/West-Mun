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
        name: 'api-dev-middleware',
        configureServer(server) {
          server.middlewares.use(async (req, res, next) => {
            if (!req.url) return next();

            let targetFilePath: string | null = null;
            if (req.url.startsWith('/api/super-admin')) {
              targetFilePath = path.resolve(process.cwd(), 'serverless/super-admin.ts');
            } else if (req.url.startsWith('/api/head-auth')) {
              targetFilePath = path.resolve(process.cwd(), 'serverless/head-auth.ts');
            } else if (
              req.url.startsWith('/api/admin') ||
              req.url.startsWith('/api/contact') ||
              req.url.startsWith('/api/register') ||
              req.url.startsWith('/api/team-register') ||
              req.url.startsWith('/api/health')
            ) {
              targetFilePath = path.resolve(process.cwd(), 'api/local-routes.ts');
            }

            if (targetFilePath) {
              try {
                const mod = await server.ssrLoadModule(targetFilePath);
                const handler = mod.default || mod;
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
      // Allow the local hostnames plus any host explicitly supplied for a
      // hosted preview. Never use a blanket allowlist.
      allowedHosts: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
