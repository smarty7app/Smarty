import { Router } from 'express';

const router = Router();

// Facebook / WhatsApp Webhook verification
router.get('/facebook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const VERIFY_TOKEN = process.env.FACEBOOK_VERIFY_TOKEN || 'smarty_verification_token';

  if (mode && token) {
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('[Facebook Webhook] Verified successfully.');
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Verification mismatch');
  }
  res.status(400).send('Bad Request');
});

// Facebook / WhatsApp / Telegram webhook events collector
router.post('/facebook', (req, res) => {
  const body = req.body;

  if (body.object === 'page' || body.object === 'whatsapp_business_account') {
    console.log(`[Facebook Webhook] Event received, body:`, JSON.stringify(body));
    // Core payload processing loop would go here in the future
    return res.status(200).send('EVENT_RECEIVED');
  }

  res.status(404).send('Not Found');
});

export default router;
