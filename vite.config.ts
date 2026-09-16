import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // Permite acesso via ngrok (host público)
      allowedHosts: ['deviation-starless-overturn.ngrok-free.dev', '.ngrok-free.dev'],
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',      proxy: {
        // Encaminha chamadas da API para o backend na porta 8000
        '/alunos': 'http://localhost:8000',
        '/auth': 'http://localhost:8000',
        '/cursos': 'http://localhost:8000',
        '/dashboard': 'http://localhost:8000',
        '/disciplinas': 'http://localhost:8000',
        '/faltas': 'http://localhost:8000',
        '/frequencia': 'http://localhost:8000',
        '/frequencias': 'http://localhost:8000',
        '/intervencoes': 'http://localhost:8000',
        '/metricas': 'http://localhost:8000',
        '/predicoes': 'http://localhost:8000',
        '/questionario': {
          target: 'http://localhost:8000',
          bypass: (req) => {
            // Não proxyar rotas do frontend (ex: /questionario-publico, /questionario-dashboard)
            if (req.url && !req.url.startsWith('/questionario/')) return req.url;
          },
        },
        '/tokens': 'http://localhost:8000',
        '/relatorios': 'http://localhost:8000',
        '/usuarios': 'http://localhost:8000',
        '/health': 'http://localhost:8000',
        '/docs': 'http://localhost:8000',
        '/openapi.json': 'http://localhost:8000',
      },    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setupTests.ts',
      css: false,
    },
  };
});
