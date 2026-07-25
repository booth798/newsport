import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * 构建时写入 dist/version.json，并注入 import.meta.env.VITE_APP_BUILD_ID。
 * 客户端轮询对比该文件，发现差异后提示刷新。
 */
export function appVersionPlugin() {
  const buildId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const payload = {
    buildId,
    builtAt: new Date().toISOString(),
  };

  return {
    name: 'mysport-app-version',
    config() {
      return {
        define: {
          'import.meta.env.VITE_APP_BUILD_ID': JSON.stringify(buildId),
        },
      };
    },
    configureServer(server) {
      // 开发态同样提供 version.json，避免本地误报更新
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split('?')[0] || '';
        if (url !== '/version.json') {
          next();
          return;
        }
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-store');
        res.end(JSON.stringify(payload));
      });
    },
    writeBundle(outputOptions) {
      const outDir = outputOptions.dir || 'dist';
      mkdirSync(outDir, { recursive: true });
      writeFileSync(join(outDir, 'version.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
    },
  };
}
