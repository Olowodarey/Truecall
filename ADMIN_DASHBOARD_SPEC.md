# Admin Dashboard Specification

## Overview

Admin dashboard for managing the TrueCall platform when automatic systems fail or manual intervention is needed.

---

## 🔑 Admin Roles & Permissions

### **ADMIN_ROLE** (Backend Wallet)

- Verify/unverify users
- Submit match results manually
- Withdraw accumulated fees
- Pause/unpause contract
- Update creation fee
- Update treasury address

### **DEFAULT_ADMIN_ROLE** (Deployer Wallet - Super Admin)

- Everything ADMIN_ROLE can do
- Grant/revoke roles
- Update AI agent address
- Deploy contract upgrades (UUPS)

---

## 📋 Admin Dashboard Sections

### **1. User Management** 🧑‍💼

#### **Verify User (Fallback)**

**When to use:**

- User completed Twitter OAuth but lost gas funds
- User's wallet transaction failed
- Emergency verification needed
- Testing/debugging

**Function:**

```solidity
function verifyAddress(address user) external onlyRole(ADMIN_ROLE)
```

**UI:**

```
┌─────────────────────────────────────────┐
│ Verify User Manually                    │
├─────────────────────────────────────────┤
│ Wallet Address: [0x...________]         │
│ [Check if verified] [Verify User]       │
│                                          │
│ Status: Not verified ❌                  │
└─────────────────────────────────────────┘
```

**API Endpoint:**

```typescript
POST / api / admin / verify - user;
Body: {
  address: "0x...";
}
```

---

#### **Batch Verify Users**

**When to use:**

- Multiple users need emergency verification
- Migration from old system
- Airdrop/promotional campaigns

**Function:**

```solidity
function verifyAddressBatch(address[] calldata users) external onlyRole(ADMIN_ROLE)
```

**UI:**

```
┌─────────────────────────────────────────┐
│ Batch Verify Users                      │
├─────────────────────────────────────────┤
│ Paste addresses (one per line):         │
│ ┌─────────────────────────────────────┐ │
│ │ 0x1234...                           │ │
│ │ 0x5678...                           │ │
│ │ 0x9abc...                           │ │
│ └─────────────────────────────────────┘ │
│ [Import CSV] [Verify All (3 users)]     │
└─────────────────────────────────────────┘
```

---

#### **Unverify User**

**When to use:**

- User violated terms of service
- Fraudulent account detected
- Spam/bot account

**Function:**

```solidity
function unverifyAddress(address user) external onlyRole(ADMIN_ROLE)
```

**UI:**

```
┌─────────────────────────────────────────┐
│ Revoke Verification                     │
├─────────────────────────────────────────┤
│ Wallet Address: [0x...________]         │
│ Reason: [Spam account___________]       │
│ [Unverify User]                          │
│                                          │
│ ⚠️ This will prevent user from joining  │
│    new events                            │
└─────────────────────────────────────────┘
```

---

### **2. Match Result Management** ⚽

#### **Submit Match Result (Manual Backup)**

**When to use:**

- AI agent failed to submit result
- API data unavailable
- Result dispute needs manual override
- Testing/debugging

**Function:**

```solidity
function submitMatchResult(
    uint256 matchId,
    uint8 homeScore,
    uint8 awayScore
) external // ADMIN_ROLE or ORACLE_ROLE
```

**UI:**

```
┌─────────────────────────────────────────┐
│ Submit Match Result Manually            │
├─────────────────────────────────────────┤
│ Match: Arsenal vs Chelsea               │
│ Match ID: 42                             │
│ Kickoff: 2026-06-05 15:00 UTC          │
│ Status: OPEN ⏳                          │
│                                          │
│ Home Score: [2__]  Away Score: [1__]    │
│                                          │
│ [Preview Winners] [Submit Result]       │
│                                          │
│ ⚠️ This action is irreversible          │
└─────────────────────────────────────────┘
```

**API Endpoint:**

```typescript
POST /api/admin/submit-result
Body: { matchId: 42, homeScore: 2, awayScore: 1 }
```

---

#### **View Pending Matches**

**When to use:**

- Monitor matches waiting for results
- Identify stuck matches
- Check AI agent performance

**UI:**

```
┌─────────────────────────────────────────────────────────┐
│ Pending Matches (Awaiting Results)                      │
├─────────────────────────────────────────────────────────┤
│ Match ID │ Teams            │ Kickoff    │ Status      │
├──────────┼──────────────────┼────────────┼─────────────┤
│ 42       │ Arsenal vs Chel  │ 2h ago     │ Finished ⚠️ │
│ 43       │ Man Utd vs Liver │ 30m ago    │ Finished ⚠️ │
│ 44       │ Bayern vs Real   │ In 2h      │ Upcoming    │
└─────────────────────────────────────────────────────────┘

⚠️ = Match finished but no result submitted (AI agent issue?)
```

---

### **3. Fee Management** 💰

#### **Withdraw Fees**

**When to use:**

- Regular treasury withdrawals
- Emergency fund access
- Platform revenue collection

**Function:**

```solidity
function withdrawFees(address recipient) external onlyRole(ADMIN_ROLE) nonReentrant
```

**UI:**

```
┌─────────────────────────────────────────┐
│ Withdraw Platform Fees                  │
├─────────────────────────────────────────┤
│ Pending Fees: 45.7 CELO (~$23 USD)     │
│                                          │
│ Recipient: [0xTreasury...______]        │
│                                          │
│ [Withdraw to Treasury]                   │
│                                          │
│ Last Withdrawal: 2026-06-01             │
│ Amount: 120.3 CELO                      │
└─────────────────────────────────────────┘
```

**API Endpoint:**

```typescript
POST / api / admin / withdraw - fees;
Body: {
  recipient: "0xTreasuryAddress...";
}
```

---

#### **Update Creation Fee**

**When to use:**

- Adjust pricing strategy
- Promotional campaigns (lower fee)
- Spam prevention (higher fee)

**Function:**

```solidity
function setCreationFee(uint256 amount) external onlyRole(ADMIN_ROLE)
```

**UI:**

```
┌─────────────────────────────────────────┐
│ Update Event Creation Fee               │
├─────────────────────────────────────────┤
│ Current Fee: 0.1 CELO (~$0.05 USD)     │
│                                          │
│ New Fee (CELO): [0.1_______]           │
│ Equivalent USD: ~$0.05                  │
│                                          │
│ [Update Fee]                             │
│                                          │
│ Fee History:                             │
│ • 2026-06-01: 0.2 → 0.1 CELO            │
│ • 2026-05-15: 0.15 → 0.2 CELO           │
└─────────────────────────────────────────┘
```

---

#### **Update Treasury Address**

**When to use:**

- Change revenue receiving wallet
- Migrate to multi-sig wallet
- Security update

**Function:**

```solidity
function setTreasury(address _treasury) external onlyRole(ADMIN_ROLE)
```

**UI:**

```
┌─────────────────────────────────────────┐
│ Update Treasury Address                 │
├─────────────────────────────────────────┤
│ Current: 0xAB26...DDeFE5b               │
│                                          │
│ New Treasury: [0x...________]           │
│                                          │
│ [Update Treasury]                        │
│                                          │
│ ⚠️ All future fee withdrawals will go   │
│    to the new address                    │
└─────────────────────────────────────────┘
```

---

### **4. Emergency Controls** 🚨

#### **Pause Contract**

**When to use:**

- Security vulnerability discovered
- Emergency maintenance
- Suspected exploit in progress
- Major bug found

**Function:**

```solidity
function pause() external onlyRole(ADMIN_ROLE)
```

**Effect:**

- ❌ No new events can be created
- ❌ No new joins
- ❌ No new predictions
- ✅ View functions still work
- ✅ Existing data safe

**UI:**

```
┌─────────────────────────────────────────┐
│ Emergency Controls                       │
├─────────────────────────────────────────┤
│ Contract Status: ACTIVE 🟢               │
│                                          │
│ [PAUSE CONTRACT]                         │
│                                          │
│ ⚠️ This will:                            │
│ • Stop all user interactions            │
│ • Prevent new events/predictions        │
│ • Keep existing data safe               │
│                                          │
│ Use only in emergencies!                 │
└─────────────────────────────────────────┘
```

---

#### **Unpause Contract**

**When to use:**

- Issue resolved
- Maintenance complete
- False alarm

**Function:**

```solidity
function unpause() external onlyRole(ADMIN_ROLE)
```

**UI:**

```
┌─────────────────────────────────────────┐
│ Emergency Controls                       │
├─────────────────────────────────────────┤
│ Contract Status: PAUSED 🔴               │
│ Paused: 2026-06-05 14:30 UTC           │
│ Duration: 2 hours 15 minutes            │
│                                          │
│ [UNPAUSE CONTRACT]                       │
│                                          │
│ ✅ This will resume normal operations   │
└─────────────────────────────────────────┘
```

---

### **5. Super Admin (DEFAULT_ADMIN_ROLE only)** 👑

#### **Update AI Agent Address**

**When to use:**

- AI agent wallet compromised
- Migrate to new agent system
- Change oracle provider

**Function:**

```solidity
function setAIAgent(address _agent) external onlyRole(DEFAULT_ADMIN_ROLE)
```

**UI:**

```
┌─────────────────────────────────────────┐
│ Update AI Agent (Super Admin Only)     │
├─────────────────────────────────────────┤
│ Current Agent: 0xAB26...DDeFE5b         │
│ Oracle Role: GRANTED ✅                  │
│                                          │
│ New Agent: [0x...________]              │
│                                          │
│ [Update AI Agent]                        │
│                                          │
│ ⚠️ Old agent will lose ORACLE_ROLE      │
│ ⚠️ New agent will get ORACLE_ROLE       │
└─────────────────────────────────────────┘
```

---

#### **Manage Roles**

**When to use:**

- Add new admin wallet
- Revoke compromised admin
- Delegate responsibilities

**Functions:**

```solidity
function grantRole(bytes32 role, address account) external onlyRole(DEFAULT_ADMIN_ROLE)
function revokeRole(bytes32 role, address account) external onlyRole(DEFAULT_ADMIN_ROLE)
```

**UI:**

```
┌─────────────────────────────────────────────────────────┐
│ Role Management (Super Admin Only)                      │
├─────────────────────────────────────────────────────────┤
│ Role: ADMIN_ROLE                                         │
│                                                          │
│ Current Admins:                                          │
│ • 0xAB26...DDeFE5b (Backend wallet)  [Revoke]          │
│ • 0x1234...567890 (Admin 2)          [Revoke]          │
│                                                          │
│ Add New Admin:                                           │
│ Address: [0x...________]                                │
│ [Grant ADMIN_ROLE]                                       │
├─────────────────────────────────────────────────────────┤
│ Role: ORACLE_ROLE                                        │
│                                                          │
│ Current Oracles:                                         │
│ • 0xAIAg...1234ab (AI Agent)         [Revoke]          │
│                                                          │
│ Add New Oracle:                                          │
│ Address: [0x...________]                                │
│ [Grant ORACLE_ROLE]                                      │
└─────────────────────────────────────────────────────────┘
```

---

## 📊 Admin Dashboard Overview

### **Main Dashboard View**

```
┌─────────────────────────────────────────────────────────────────┐
│ TrueCall Admin Dashboard                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ System Status: ACTIVE 🟢                                        │
│                                                                  │
│ ┌──────────────┬──────────────┬──────────────┬──────────────┐ │
│ │ Total Events │ Active Users │ Pending Fees │ Unverified   │ │
│ │     127      │     2,450    │  45.7 CELO   │     18       │ │
│ └──────────────┴──────────────┴──────────────┴──────────────┘ │
│                                                                  │
│ ⚠️ Alerts (2)                                                    │
│ • 3 matches awaiting results (>2h old)                          │
│ • Pending fees > 40 CELO (consider withdrawal)                  │
│                                                                  │
│ Quick Actions:                                                   │
│ [Verify User] [Submit Result] [Withdraw Fees] [Pause Contract] │
│                                                                  │
│ Recent Activity:                                                 │
│ • Match 42 result submitted manually (5m ago)                   │
│ • User 0x1234... verified (12m ago)                             │
│ • Fees withdrawn: 120.3 CELO (2h ago)                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Access Control

### **Authentication**

- Admin must connect wallet (MetaMask/WalletConnect)
- Contract checks `hasRole(ADMIN_ROLE, msg.sender)`
- Frontend shows/hides admin buttons based on role

### **Two-Tier Admin System**

```
DEFAULT_ADMIN_ROLE (Deployer)
    │
    ├── Can do everything
    ├── Manage roles
    ├── Update AI agent
    └── Deploy upgrades

ADMIN_ROLE (Backend Wallet)
    │
    ├── Verify users
    ├── Submit results
    ├── Withdraw fees
    └── Pause contract
```

---

## 🎨 UI/UX Recommendations

### **Design Principles**

1. **Clear warnings** for destructive actions
2. **Confirmation dialogs** for critical operations
3. **Activity logs** for all admin actions
4. **Gas estimates** before transactions
5. **Status indicators** (pending, success, failed)

### **Color Coding**

- 🟢 Green: Safe actions (view, check status)
- 🟡 Yellow: Medium risk (verify user, update settings)
- 🔴 Red: High risk (pause contract, withdraw fees)

### **Notifications**

- Success: "✅ User verified successfully"
- Error: "❌ Transaction failed: Insufficient gas"
- Warning: "⚠️ This action cannot be undone"

---

## 📝 API Endpoints Needed

```typescript
// User Management
POST   /api/admin/verify-user          { address }
POST   /api/admin/verify-users-batch   { addresses[] }
POST   /api/admin/unverify-user        { address }
GET    /api/admin/unverified-users     → { users[] }

// Match Management
POST   /api/admin/submit-result        { matchId, homeScore, awayScore }
GET    /api/admin/pending-matches      → { matches[] }

// Fee Management
POST   /api/admin/withdraw-fees        { recipient }
POST   /api/admin/set-creation-fee     { amount }
POST   /api/admin/set-treasury         { address }
GET    /api/admin/fee-stats            → { pending, history }

// Emergency
POST   /api/admin/pause-contract
POST   /api/admin/unpause-contract
GET    /api/admin/contract-status      → { paused, pendingFees, etc }

// Super Admin (DEFAULT_ADMIN_ROLE)
POST   /api/admin/set-ai-agent         { address }
POST   /api/admin/grant-role           { role, address }
POST   /api/admin/revoke-role          { role, address }
GET    /api/admin/roles                → { admins[], oracles[] }
```

---

## ✅ Implementation Checklist

### **Backend**

- [ ] Create `/api/admin/*` endpoints
- [ ] Add `AdminGuard` (checks wallet has ADMIN_ROLE)
- [ ] Add `SuperAdminGuard` (checks DEFAULT_ADMIN_ROLE)
- [ ] Implement all admin service functions
- [ ] Add activity logging for audit trail

### **Frontend**

- [ ] Create `/admin` route (protected)
- [ ] Build user management UI
- [ ] Build match result submission UI
- [ ] Build fee management UI
- [ ] Build emergency controls UI
- [ ] Add role-based component visibility
- [ ] Add transaction confirmation dialogs

### **Smart Contract**

- [x] `selfVerify()` - users self-verify
- [x] `verifyAddress()` - admin override
- [x] `verifyAddressBatch()` - bulk verify
- [x] `unverifyAddress()` - revoke verification
- [x] `submitMatchResult()` - manual result submission
- [x] `withdrawFees()` - withdraw accumulated fees
- [x] `setCreationFee()` - update event fee
- [x] `setTreasury()` - update treasury address
- [x] `pause()` / `unpause()` - emergency stop
- [x] `setAIAgent()` - update oracle address

---

**Status**: ✅ Specification complete
**Next**: Implement admin API endpoints and frontend dashboard
