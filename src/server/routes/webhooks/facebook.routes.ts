import { Router } from 'express';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../../config.js';

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
router.post('/facebook', async (req, res) => {
  const body = req.body;

  try {
    // 1. WhatsApp Webhook Event
    if (body.object === 'whatsapp_business_account') {
      console.log(`[WhatsApp Webhook] Event received:`, JSON.stringify(body));
      const entry = body.entry?.[0];
      const change = entry?.changes?.[0]?.value;
      const metadata = change?.metadata;
      const messageObj = change?.messages?.[0];

      if (metadata && messageObj && messageObj.text?.body) {
        const phoneNumberId = metadata.phone_number_id;
        const senderId = messageObj.from;
        const text = messageObj.text.body;

        // Find merchant by WhatsApp phoneNumberId
        const q = query(
          collection(db, 'merchant_connections'),
          where('whatsapp.phoneNumberId', '==', phoneNumberId)
        );
        const querySnapshot = await getDocs(q);
        let merchantId = 'unknown';
        if (!querySnapshot.empty) {
          merchantId = querySnapshot.docs[0].id;
        }

        // Add to incoming_messages
        await addDoc(collection(db, 'incoming_messages'), {
          merchantId,
          senderId,
          platform: 'whatsapp',
          text,
          status: 'pending',
          createdAt: new Date().toISOString()
        });
        console.log(`[WhatsApp Webhook] Saved incoming message from ${senderId} for merchant ${merchantId}`);
      }
      return res.status(200).send('EVENT_RECEIVED');
    }

    // 2. Facebook / Instagram Messenger Event
    if (body.object === 'page' || body.object === 'instagram') {
      console.log(`[Facebook/Instagram Webhook] Event received:`, JSON.stringify(body));
      const entry = body.entry?.[0];
      const pageId = entry?.id;
      const messaging = entry?.messaging?.[0];

      if (pageId && messaging && messaging.message?.text) {
        const senderId = messaging.sender?.id;
        const text = messaging.message.text;
        const isInstagram = body.object === 'instagram';
        const platform = isInstagram ? 'instagram' : 'facebook';

        // Find merchant by pageId or businessId
        const fieldPath = isInstagram ? 'instagram.businessId' : 'facebook.pageId';
        const q = query(
          collection(db, 'merchant_connections'),
          where(fieldPath, '==', pageId)
        );
        const querySnapshot = await getDocs(q);
        let merchantId = 'unknown';
        if (!querySnapshot.empty) {
          merchantId = querySnapshot.docs[0].id;
        }

        // Add to incoming_messages
        await addDoc(collection(db, 'incoming_messages'), {
          merchantId,
          senderId,
          platform,
          text,
          status: 'pending',
          createdAt: new Date().toISOString()
        });
        console.log(`[${platform.toUpperCase()} Webhook] Saved incoming message from ${senderId} for merchant ${merchantId}`);
      }
      return res.status(200).send('EVENT_RECEIVED');
    }

    // Default response for unhandled objects
    res.status(200).send('OK');
  } catch (error: any) {
    console.error('[Webhook Processing Error]:', error.message || error);
    res.status(500).send('Internal Server Error');
  }
});

export default router;
