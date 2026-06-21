import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

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

// Setup JSON parsing and capture rawBody buffer for cryptographic signature validation
app.use(express.json({
  limit: '20mb',
  verify: (req: any, res, buf) => {
    req.rawBody = buf.toString('utf-8');
  }
}));

// Mount Webhook routers first (untainted by authorization interceptors)
app.use('/api/webhooks', chargilyWebhookRouter);
app.use('/api/webhooks', facebookWebhookRouter);

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
