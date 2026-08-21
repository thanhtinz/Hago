import http from 'http';
import path from 'path';
import cors from 'cors';
import express from 'express';
import { CONFIG } from './config';
import { renderAvatar } from './avatar';
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { socialRouter } from './routes/social';
import { economyRouter } from './routes/economy';
import { progressRouter } from './routes/progress';
import { guildsRouter } from './routes/guilds';
import { tournamentsRouter } from './routes/tournaments';
import { adminRouter } from './routes/admin';
import { initGateway } from './realtime/gateway';
import { ensureSeed } from './seed';

const app = express();
app.set('trust proxy', 1);
app.use(cors({ origin: CONFIG.corsOrigin }));
app.use(express.json({ limit: '256kb' }));

app.get('/health', (_req, res) => res.json({ ok: true, uptime: process.uptime(), ts: Date.now() }));

/** Chibi avatar SVG render server-side, cache mạnh vì deterministic theo seed. */
app.get('/avatar/:style/:seed.svg', (req, res) => {
  const size = Math.min(512, Math.max(32, Number(req.query.size ?? 160)));
  const svg = renderAvatar(req.params.style, req.params.seed, size);
  res.setHeader('Content-Type', 'image/svg+xml');
  res.setHeader('Cache-Control', 'public, max-age=604800, immutable');
  res.send(svg);
});

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/social', socialRouter);
app.use('/api/economy', economyRouter);
app.use('/api', progressRouter);
app.use('/api/guilds', guildsRouter);
app.use('/api/tournaments', tournamentsRouter);
app.use('/api/admin', adminRouter);

// Admin dashboard build tĩnh (nếu đã chạy `npm run build -w @hago/admin`).
app.use('/admin', express.static(path.join(__dirname, '../../admin/dist')));

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[api]', err);
  res.status(500).json({ error: 'INTERNAL', message: String(err?.message ?? err) });
});

ensureSeed();

const server = http.createServer(app);
initGateway(server);

server.listen(CONFIG.port, CONFIG.host, () => {
  console.log(`Hago server listening on http://${CONFIG.host}:${CONFIG.port}`);
});
