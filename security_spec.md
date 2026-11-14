# OrthoGro Security Specification

## 1. Data Invariants
1. **Strict Ownership Isolation**: Every document in `/users/{userId}` and its subcollections (`/transactions/{txId}`, `/memos/{memoId}`, `/notes/{noteId}`) belongs strictly to `userId` and must have `ownerId == request.auth.uid`. No user can read, list, create, update, or delete another user's records.
2. **Verified Identity**: Write operations require an authenticated Firebase user with `request.auth.token.email_verified == true`.
3. **Immutable Ownership & Timestamps**: `ownerId` and `createdAt` cannot be changed after creation. `createdAt` and `updatedAt` must equal `request.time`.
4. **Bounded Collections & Strings**: Every string field enforces strict `.size()` caps and IDs match `^[a-zA-Z0-9_\-]+$` (max 128 chars). Array fields (`wallets`, `savingsList`, `expenseCategories`, `incomeCategories`, `gridOrder`, `items`) are bounded in size.
5. **No Shadow Fields**: `keys().hasAll(...)` and `keys().hasOnly(...)` block undocumented ghost fields on create, and `affectedKeys().hasOnly(...)` restricts update mutations.

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Cross-User Read**: User B attempts `get(/users/userA/transactions/tx1)`.
2. **Cross-User List**: User B attempts `list(/users/userA/transactions)`.
3. **Identity Spoofing on Create**: User A writes `/users/userA/transactions/tx1` with `ownerId: "userB"`.
4. **Ghost / Shadow Field Injection**: User A creates a transaction with extra field `isAdmin: true`.
5. **Unverified Email Write**: User A with `email_verified: false` attempts to create a transaction.
6. **Oversized ID Poisoning**: User A attempts to create `/users/userA/transactions/<200-char-invalid-id!>`.
7. **Oversized Note String (Denial of Wallet)**: User A creates a note with `content` > 20,000 characters.
8. **Unbounded Wallets Array**: User A updates `/users/userA` with 60 wallets (> 50 limit).
9. **Client-Forged Timestamp**: User A sets `createdAt` to a past timestamp instead of `request.time`.
10. **Immutable Field Tampering**: User A updates a transaction's `ownerId` or `createdAt`.
11. **Invalid Enum Type**: User A creates a transaction with `type: "hacked_type"`.
12. **Blanket Root Access**: Any user attempts to read/write `/arbitraryCollection/doc1` (blocked by global default-deny catch-all).
