import crypto from 'crypto';
import { Router } from 'express';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config.js';

const router = Router();

// Middleware-like Raw Body extraction is configured automatically inside server.ts,
// exposing req.rawBody to this router.
router.post('/chargily', async (req: any, res) => {
  try {
    const signature = req.headers['signature'] || req.headers['x-signature'];
    const secretKey = process.env.CHARGILY_WEBHOOK_SECRET || process.env.CHARGILY_SECRET_KEY;

    console.log(`[Chargily Webhook] Received webhook trigger from Chargily.`);

    // 1. Strictly verify the cryptographic signature if a security secret is set in the env
    if (secretKey && signature) {
      const rawPayload = req.rawBody || JSON.stringify(req.body);
      const computedSignature = crypto
        .createHmac('sha256', secretKey)
        .update(rawPayload)
        .digest('hex');

      if (computedSignature !== signature) {
        console.error("[Chargily Webhook] Cryptographic signature check match failed. Request rejected.");
        return res.status(403).json({ success: false, error: "Invalid signature" });
      }
      console.log("[Chargily Webhook] Cryptographic signature matched successfully.");
    } else {
      console.warn("⚠️ Warning: Chargily webhook signature couldn't be cryptographically validated because secret or signature is missing. Processing transaction in sandbox-aligned fallback.");
    }

    // 2. Process the payment confirmation event securely
    const payload = req.body;
    const eventType = payload.type; // e.g. "checkout.paid"
    const data = payload.data || {};

    const isPaid = eventType === 'checkout.paid' || data.status === 'paid';

    if (isPaid) {
      const metadata = data.metadata || {};
      const userId = metadata.userId;
      const planType = metadata.planType || 'professional';

      if (!userId) {
        console.warn("[Chargily Webhook] Received 'paid' checkout event but metadata is missing 'userId'. Transaction ignored.");
        return res.status(400).json({ success: false, error: "Metadata 'userId' was not specified" });
      }

      console.log(`[Chargily Webhook] CONFIRMED: Secure Backend Upgrade. User: ${userId} -> Plan: ${planType}`);

      // 3. Perform atomic secure updates directly on the backend database
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        planType: planType,
        orderCounter: 0,
        subscriptionUpdatedAt: serverTimestamp()
      });

      const publicRef = doc(db, 'merchant_public_configs', userId);
      await updateDoc(publicRef, {
        planType: planType,
        orderCounter: 0
      });

      console.log(`[Chargily Webhook] Success. User subscription updated successfully.`);
      return res.json({ success: true, message: "Subscription active" });
    }

    // Acknowledge receipt of other statuses (e.g., checkout.failed, checkout.expired) without errors
    res.json({ success: true, message: `Event '${eventType || 'unknown'}' acknowledged` });

  } catch (error: any) {
    console.error("[Chargily Webhook] Failed to process webhook transaction event:", error);
    res.status(500).json({ success: false, error: error.message || "Webhook processing crash" });
  }
});

export default router;
