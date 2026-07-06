import { User as FirebaseUser } from 'firebase/auth';

export interface OrderItem {
  id?: string;
  product: string;
  quantity: number;
  size: string;
  color: string;
  pricePerUnit: number;
}

export interface OrderData {
  id?: string;
  name: string;
  phone: string;
  wilaya: string;
  commune: string;
  items: OrderItem[];
  note: string;
  possible_fake_order: boolean;
  delivery_type: "home" | "desk";
  status: "pending" | "confirmed" | "shipped" | "delivered" | "returned";
  shipping_company?: string;
  tracking_number?: string;
  label_url?: string;
  location_url?: string;
  createdAt?: any;
  shippingFee: number;
  totalPrice: number;
}

export interface InventoryItem {
  id?: string;
  productName: string;
  stockQuantity: number;
  price: number;
  userId: string;
}

export interface Product {
  id?: string;
  productName: string;
  description?: string;
  price: number;
  stockQuantity: number;
  category?: string;
  sku?: string;
  imageUrl?: string;
  userId: string;
  isPublished?: boolean;
  createdAt?: string;
  updatedAt?: string;
  sizes?: string;
  colors?: string;
  sizeLabel?: string;
  colorLabel?: string;
}

export interface UserData {
  planType: "free" | "pro" | "unlimited" | "basic" | "professional" | "business" | "enterprise";
  orderCounter: number;
  expiresAt?: string;
  subscriptionStatus: "active" | "pending_verification" | "expired";
  email?: string;
  hasBeenWelcomed?: boolean;
  
  // Usage tracking fields
  merchantId?: string;
  ordersProcessed?: number;
  tokensUsed?: number;
  shippingRequests?: number;
  storageUsed?: number;
  aiCost?: number;
  subscriptionPlan?: string;
  lastBillingDate?: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface MerchantWebhookConfig {
  userId: string;
  webhookSecret: string;
  isEnabled: boolean;
  platformConfigs: {
    telegram?: { botToken: string; chatId?: string };
    whatsapp?: { phoneNumberId: string; accessToken: string };
    instagram?: { pageId: string; accessToken: string };
  };
  createdAt: any;
  updatedAt: any;
}

export interface WebhookPayload {
  messageText: string;
  platform: "telegram" | "whatsapp" | "instagram";
  platformUserId: string;
  timestamp: number;
}

export interface MerchantConnections {
  id?: string; // merchantId as the document ID
  facebook?: {
    pageId: string;
    accessToken: string;
    pageName: string;
    connectedAt: string;
  };
  instagram?: {
    businessId: string;
    accessToken: string;
    connectedAt: string;
  };
  whatsapp?: {
    phoneNumberId: string;
    accessToken: string;
    connectedAt: string;
  };
}

export interface IncomingMessage {
  id?: string; // autoId as the document ID
  merchantId: string;
  senderId: string;
  platform: "facebook" | "instagram" | "whatsapp";
  text: string;
  status: "pending" | "processed" | "failed";
  createdAt: any; // ISO string or serverTimestamp
}

