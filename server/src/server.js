import dns from 'dns';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config, assertCoreConfig } from './config/env.js';
import { connectDatabase } from './config/db.js';
import routes from './routes/index.js';
import { errorHandler, notFound } from './middleware/error.js';
import { generalLimiter } from './middleware/rateLimiters.js';
import { seedExamPatterns } from './seed/seedExamPatterns.js';

// Atlas SRV lookups fail on some ISP networks: force IPv4 and public resolvers.
dns.setDefaultResultOrder('ipv4first');
dns.setServers(['1.1.1.1', '8.8.8.8']);

const app = express();

app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: config.clientUrl.split(',').map((url) => url.trim()),
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));
if (config.env !== 'test') app.use(morgan('dev'));
app.use('/api', generalLimiter);
app.use('/api', routes);
app.use(notFound);
app.use(errorHandler);

async function start() {
  try {
    assertCoreConfig();
    await connectDatabase();
    console.log('[mongo] connected');
    await seedExamPatterns();
    app.listen(config.port, () => {
      console.log(`[server] listening on http://localhost:${config.port} (${config.env})`);
      if (!process.env.AI_API_KEY) {
        console.warn('[ai] AI_API_KEY is not set — question generation will return a clear error until it is.');
      }
    });
  } catch (error) {
    console.error('[server] failed to start:', error.message);
    process.exit(1);
  }
}

process.on('unhandledRejection', (reason) => {
  console.error('[server] unhandled rejection:', reason);
});

start();

export default app;
