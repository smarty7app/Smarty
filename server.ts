import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { rateLimit } from 'express-rate-limit';

// Import modular business routes
import aiRouter from './src/server/routes/ai.routes.ts';
import subscriptionRouter from './src/server/routes/subscription.routes.ts';
import chargilyWebhookRouter from './src/server/routes/webhooks/chargily.routes.ts';
import facebookWebhookRouter from './src/server/routes/webhooks/facebook.routes.ts';
import shippingRouter from './src/server/routes/shipping.routes.ts';
import storeRouter from './src/server/routes/store.routes.ts';
import inventoryRouter from './src/server/routes/inventory.routes.ts';

dotenv.config();

const app = express();
const PORT = 3000;

// Enable 'trust proxy' so express-rate-limit can accurately detect client IPs behind the Cloud Run and Nginx proxies
app.set('trust proxy', 1);

// Configure a resilient global backend rate limiter to mitigate brute-force and DDoS attempts
const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 200, // Limit each client IP to 200 requests per 15-minute window
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this client connection, please attempt again in 15 minutes.'
  }
});

// Configure a stringent limiter specifically for sensitive endpoints (like webhooks) to prevent high-frequency scanning
const sensitiveApiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  limit: 50, // Limit sensitive webhook tests or brute-force signature guesses to 50 requests
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Access limit reached. Retrying too rapidly.'
  }
});

// Apply rate limiting to all /api endpoints
app.use('/api', globalApiLimiter);

// Setup JSON parsing and capture rawBody buffer for cryptographic signature validation
app.use(express.json({
  limit: '20mb',
  verify: (req: any, res, buf) => {
    req.rawBody = buf.toString('utf-8');
  }
}));

// Mount Webhook routers first (untainted by authorization interceptors) with specific sensitive rate limiter
app.use('/api/webhooks', sensitiveApiLimiter, chargilyWebhookRouter);
app.use('/api/webhooks', sensitiveApiLimiter, facebookWebhookRouter);

// Mount Business Domain logic routers
app.use('/api', aiRouter);
app.use('/api/ai', aiRouter); // Backward compatibility for any old client endpoints
app.use('/api', subscriptionRouter);
app.use('/api', shippingRouter);
app.use('/api', storeRouter);
app.use('/api', inventoryRouter);

// Initialize Express Server & Vite
async function initServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SmartyAI Server running on http://localhost:${PORT}`);
  });
}

initServer();
