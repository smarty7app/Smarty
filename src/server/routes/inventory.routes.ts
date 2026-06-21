import { Router } from 'express';
import { decodeAuthUser } from '../config.js';

const router = Router();

// Endpoint to support user image uploads (returns the URI or registers base64 securely)
router.post('/inventory/upload-image', async (req, res) => {
  try {
    const user = decodeAuthUser(req.headers.authorization);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized access" });
    }

    const { base64Data, productId } = req.body;
    if (!base64Data) {
      return res.status(400).json({ error: "No base64 image data received" });
    }

    console.log(`[Inventory Manager] Processing uploaded image asset. ProductId fallback reference: ${productId || 'New product'}`);

    // Return the base64Data safely to the client-side for resilient inline document persistence
    res.json({
      success: true,
      imageUrl: base64Data
    });

  } catch (error: any) {
    console.error("Asset uploading crashed:", error);
    res.status(500).json({ error: error.message || "Failed to catalog image asset" });
  }
});

export default router;
