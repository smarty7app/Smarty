# Firestore Security Specification (Zero-Trust Security)

This document establishes the Data Invariants, the "Dirty Dozen" malicious payload testing suite, and security rules assertions to eliminate any possible vulnerabilities in our database layer.

## 1. Data Invariants

1. **Order Identity Lock**: An order can only be created with `userId` referring to an existing merchant's UID. Once created, `userId` is immutable.
2. **Access Isolation (PII Guard)**: Public/anonymous users can CREATE a storefront order, but they are **FORBIDDEN** from listing or reading (`get`) any existing order, which isolates customer personal information (names, phone numbers, addresses, items) to the merchant who owns the store.
3. **Admin Privilege Tier**: Only authorized administrators can view or update other merchants' orders or user records.
4. **State Integrity**: Storefront-created orders must always start in the `"pending"` status. Public checkouts are strictly forbidden from setting orders directly to `"confirmed"`, `"shipped"`, or `"delivered"`.
5. **Anti-Poisoning Size Limits**: Every text field (e.g., customer name, phone, wilaya, note) must be size-constrained, and item array sizes are strictly capped to prevent wallet-exhaustion attacks.

---

## 2. The "Dirty Dozen" (12 Malicious Payloads)

Here are 12 specific payloads or access patterns that our rules must reject to enforce Zero-Trust:

### 1. Privilege Escalation - Self-Promoting Role (on `/users`)
*   **Malicious Payload**: An authenticated user tries to update their user profile role to `"admin"`.
*   **Expected Result**: `PERMISSION_DENIED`

### 2. ID Poisoning (on `/orders`)
*   **Malicious Payload**: An attacker attempts to create an order with an extremely long document ID (e.g., 20KB of junk text) to exhaust Firestore indexing resources.
*   **Expected Result**: `PERMISSION_DENIED` (ID matches string regex and is <= 128 characters)

### 3. State Bypass / Spoofing (on `/orders`)
*   **Malicious Payload**: A public storefront customer attempts to create a new order and pre-approves/ships it by setting `"status": "shipped"`.
*   **Expected Result**: `PERMISSION_DENIED` (anonymous create must have `"status": "pending"`)

### 4. Shadow Field Injection (on `/orders`)
*   **Malicious Payload**: A payload containing extra unvalidated field keys like `"isVIP": true` or `"overrideSubscriptionLimit": true` to trigger unintended client logic.
*   **Expected Result**: `PERMISSION_DENIED` (enforce precise schema keys check)

### 5. Hijacking Merchant ID (on `/orders`)
*   **Malicious Payload**: A user tries to create an order for a nonexistent merchant ID (e.g., `"userId": "non_existent_id"`) or a spoofed user ID.
*   **Expected Result**: `PERMISSION_DENIED` (merchant ID must be verified using `exists()`)

### 6. Public/Anonymous Information Scraping (on `/orders`)
*   **Malicious Payload**: An unauthenticated or random user tries to run a list query (`getDocs`) on the `/orders` collection to scrape orders of other users.
*   **Expected Result**: `PERMISSION_DENIED` (reads are strictly restricted to `isOwner(userId)` or `isAdmin()`)

### 7. Denial-of-Wallet Array Flooding (on `/orders`)
*   **Malicious Payload**: An attacker attempts to submit an order with `items` list containing 10,000 sub-items to crash the database engine or trigger exorbitant billing.
*   **Expected Result**: `PERMISSION_DENIED` (`items.size() <= 20`)

### 8. Rogue Merchant Impersonation (on `/inventory`)
*   **Malicious Payload**: An authenticated user tries to create an inventory item with `"userId"` set to another user's UID.
*   **Expected Result**: `PERMISSION_DENIED` (must match `request.auth.uid`)

### 9. Illegal Stock Modification (on `/inventory`)
*   **Malicious Payload**: A public storefront client tries to directly write/decrease stock on a product document directly.
*   **Expected Result**: `PERMISSION_DENIED` (write/update is restricted to the merchant owner)

### 10. Email Spoofing Admin Bypass
*   **Malicious Payload**: A malicious actor registers a Google account with email `smarty7.app@gmail.com` but does not verify the email (`email_verified: false`) and attempts to access `/users` collection.
*   **Expected Result**: `PERMISSION_DENIED` (verification checks `request.auth.token.email_verified == true`)

### 11. Subscription Request Hijack
*   **Malicious Payload**: A standard user attempts to approve or delete another merchant's subscription request.
*   **Expected Result**: `PERMISSION_DENIED` (only `isAdmin()` has update/delete permission on `/subscription_requests`)

### 12. Support Messages Overflooding
*   **Malicious Payload**: An anonymous user attempts to flood `/support_messages` with an enormous payload body exceeding 5,000 characters.
*   **Expected Result**: `PERMISSION_DENIED` (size limits enforced on text attributes)
