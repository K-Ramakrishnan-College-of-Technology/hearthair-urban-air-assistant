# Security Specification & Payload-First TDD

## 1. Data Invariants
1. **Owner-Only Household Isolation**: Every document under `/users/{userId}` and its subcollections (`/plans/{planId}`, `/interactions/{interactionId}`, `/impactLogs/{logId}`) MUST belong exclusively to the authenticated, email-verified user whose `request.auth.uid == userId` and `data.ownerId == request.auth.uid`.
2. **Path Variable Hardening**: Every document ID (`userId`, `planId`, `interactionId`, `logId`) MUST satisfy `^[a-zA-Z0-9_-]+$` and length `<= 128`.
3. **Immutable Ownership & Timestamps**: `ownerId` and `createdAt` are immutable after document creation. `createdAt` and `updatedAt` MUST match `request.time`.
4. **Bounded Fields & Lists**: All strings have explicit `.size()` upper bounds, and all arrays (`dailyRoutines`, `indoorHacks`, `alternatives`) are capped in length and verified to contain map elements when non-empty.
5. **No Shadow Fields**: Both `create` (`keys().hasAll(...) && keys().hasOnly(...)`) and `update` (`affectedKeys().hasOnly(...)`) reject unapproved or injected properties.

## 2. Adversarial "Dirty Dozen" Payloads (Expected: PERMISSION_DENIED)
1. **Unauthenticated Read/Write**: `request.auth == null` attempting to read `/users/u1/plans/p1`.
2. **Unverified Email Write**: `request.auth.token.email_verified == false` attempting to create `/users/u1`.
3. **Cross-User Read (IDOR)**: User `u2` attempting `get` or `list` on `/users/u1/plans`.
4. **Identity Spoofing on Create**: User `u1` creating `/users/u1/plans/p1` with `ownerId: "u2"`.
5. **Ownership Hijack on Update**: User `u1` updating `/users/u1/plans/p1` to change `ownerId` to `"u2"`.
6. **Shadow Field Injection**: User `u1` creating `/users/u1` with an extra field `isAdmin: true` or `role: "admin"`.
7. **ID Poisoning**: Creating `/users/u1/plans/<2000-char-id>` or ID containing `/` or `$`.
8. **Client Timestamp Forgery**: Creating `/users/u1/interactions/i1` with a backdated `createdAt` not equal to `request.time`.
9. **Immutable Timestamp Mutation**: Updating `/users/u1` and modifying `createdAt`.
10. **Oversized Payload / Denial of Wallet**: Sending a 50,000-character `answer` string to `/users/u1/interactions/i1`.
11. **Unbounded Array Injection**: Sending 50 elements inside `dailyRoutines` or a non-map element `[123]` inside `dailyRoutines`.
12. **Out-of-Range Enum/Numeric Bypass**: Sending `aqiLevel: 9999` or `category: "unknown_enum"` in `/users/u1/impactLogs/l1`.
