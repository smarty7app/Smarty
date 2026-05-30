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

export interface UserData {
  planType: "free" | "pro" | "unlimited" | "basic" | "professional" | "business" | "enterprise";
  orderCounter: number;
  expiresAt?: string;
  subscriptionStatus: "active" | "pending_verification" | "expired";
  email?: string;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}
