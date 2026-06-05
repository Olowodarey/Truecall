# Enhanced Admin Dashboard Specification

## Overview

A comprehensive, detailed admin control center with all platform management capabilities.

## Features to Implement

### 1. **Overview Tab** (Dashboard Home)

- **Real-time Statistics**
  - Total Events Created
  - Total Matches
  - Total Users Verified
  - Pending Fees
  - Creation Fee
  - Platform Health Status
- **Recent Activity Feed**
  - Last 10 events created
  - Recent verifications
  - Recent match results submitted
  - Fee withdrawals

- **Quick Actions Panel**
  - Quick verify user
  - Quick submit match result
  - Emergency pause contract
  - View latest transactions

### 2. **User Verification Tab**

- **Single User Operations**
  - Verify address (with blockchain check)
  - Unverify address
  - Check verification status
- **Batch Operations**
  - Batch verify (paste list of addresses)
  - Progress indicator for batch operations
  - Success/failure report

- **User Search & Management**
  - Search by wallet address
  - Search by Twitter handle
  - View user details
  - See verification history

### 3. **Match Management Tab**

- **Submit Match Results** (AI Fallback)
  - Search matches by ID or event
  - Filter by status (OPEN, VERIFIED, etc.)
  - Submit score for any match
  - View match details before submission
  - Confirmation before submitting
- **Match Browser**
  - List all matches with pagination
  - Filter by:
    - Event ID
    - Status
    - Date range
  - Sort by:
    - Match ID
    - Kickoff time
    - Status
- **Match Details View**
  - Teams
  - Kickoff time
  - Current status
  - Submitted scores
  - Number of predictions
  - Winners (if result submitted)

### 4. **User Management Tab**

- **Twitter Linking** (Backend Integration)
  - Link Twitter to wallet address
  - Form inputs:
    - Wallet address
    - Twitter handle
    - Twitter ID (optional)
  - Validation before linking
- **Twitter Unlinking**
  - Unlink Twitter from wallet
  - Confirmation dialog
  - Cascade unlink (remove verification too?)
- **User Directory**
  - Paginated list of all users
  - Search by address or Twitter
  - Filter by:
    - Verified users only
    - Twitter-linked users only
    - Recently joined
  - Bulk actions:
    - Export user list
    - Bulk verify
    - Bulk unlink

- **User Details Panel**
  - Wallet address
  - Twitter handle (if linked)
  - Verification status (blockchain)
  - Events participated in
  - Total predictions made
  - Wins/Losses ratio
  - Account created date

### 5. **Fee Management Tab**

- **Fee Configuration**
  - Current creation fee display
  - Update creation fee
  - Fee history (if tracking)
  - Recommended fee calculator
- **Treasury Management**
  - Pending fees display
  - Withdraw fees to address
  - Withdrawal history
  - Treasury balance
- **Revenue Analytics**
  - Total fees collected
  - Fees by time period
  - Average fee per event
  - Projection calculator

### 6. **Settings Tab**

- **Contract Information**
  - Contract address
  - Network details
  - Block explorer link
  - Current admin address
  - Deployer address
- **Role Management** (View Only)
  - DEFAULT_ADMIN_ROLE holders
  - ADMIN_ROLE holders
  - ORACLE_ROLE holders
  - Note: Role changes done via deployer wallet
- **System Settings**
  - Max participants per event
  - Max matches per event
  - Contract pause status
  - Emergency controls
- **Logs & Monitoring**
  - Recent transactions
  - Error logs
  - Performance metrics
  - API health status

### 7. **Analytics Tab** (Bonus)

- **Platform Metrics**
  - Daily active users
  - Events created per day
  - Predictions submitted per day
  - Revenue per day
- **Charts & Graphs**
  - Event creation trend
  - User growth
  - Revenue trend
  - Match completion rate
- **Export Data**
  - Export users CSV
  - Export events CSV
  - Export matches CSV
  - Export transactions CSV

## UI Components Needed

### Data Display Components

1. **StatCard** - Display key metrics
2. **DataTable** - Paginated tables with sorting/filtering
3. **UserCard** - Display user information
4. **MatchCard** - Display match information
5. **ActivityFeed** - Recent actions timeline
6. **ProgressBar** - For batch operations
7. **Modal** - Confirmation dialogs

### Form Components

1. **AddressInput** - Validates Ethereum addresses
2. **SearchInput** - With debounce
3. **FilterDropdown** - Multi-select filters
4. **DateRangePicker** - For date filtering
5. **ScoreInput** - For match scores (0-99)

### Action Components

1. **ActionButton** - Primary actions
2. **DangerButton** - Destructive actions
3. **IconButton** - Small actions
4. **DropdownMenu** - Context menus
5. **TabNavigation** - Switch between sections

## Backend API Endpoints Needed

### User Management

- `GET /api/admin/users` - List all users (paginated)
- `GET /api/admin/users/:address` - Get user details
- `POST /api/admin/users/link-twitter` - Link Twitter to address
- `POST /api/admin/users/unlink-twitter` - Unlink Twitter
- `GET /api/admin/users/search` - Search users

### Match Management

- `GET /api/admin/matches` - List all matches (paginated)
- `GET /api/admin/matches/:id` - Get match details
- `GET /api/admin/matches/:id/predictions` - Get predictions for match
- `GET /api/admin/matches/:id/winners` - Get winners for match

### Analytics

- `GET /api/admin/stats` - Platform statistics
- `GET /api/admin/activity` - Recent activity feed
- `GET /api/admin/revenue` - Revenue metrics

## Contract Functions to Add to ABI

Already have most, but ensure these are included:

- `submitMatchResult(matchId, homeScore, awayScore)` - ✅
- `verifyAddress(address)` - ✅
- `verifyAddressBatch(address[])` - ✅
- `unverifyAddress(address)` - ✅
- `setCreationFee(amount)` - ✅
- `withdrawFees(recipient)` - ✅
- `pause()` - ❌ Need to add
- `unpause()` - ❌ Need to add

## Implementation Priority

### Phase 1 (Critical)

1. Match result submission
2. User verification management
3. Fee management
4. Basic user search

### Phase 2 (Important)

1. Twitter linking/unlinking
2. User directory with filters
3. Match browser with filters
4. Activity feed

### Phase 3 (Nice to Have)

1. Analytics dashboard
2. Revenue charts
3. Export functionality
4. Advanced search

## Security Considerations

1. **Access Control**
   - Double-check admin address on every action
   - Log all admin actions
   - Confirm destructive actions

2. **Input Validation**
   - Validate all addresses (checksum)
   - Validate scores (0-99 range)
   - Validate Twitter handles (format)
   - Sanitize all inputs

3. **Transaction Safety**
   - Show transaction preview
   - Require confirmation for:
     - Batch operations
     - Fee withdrawals
     - Fee updates
   - Gas estimation before signing

4. **Error Handling**
   - User-friendly error messages
   - Retry mechanisms
   - Fallback UI states
   - Detailed error logging

## Testing Checklist

- [ ] Admin access control works
- [ ] Non-admin users are blocked
- [ ] Network switching works
- [ ] Verify user works
- [ ] Unverify user works
- [ ] Batch verify works
- [ ] Submit match result works
- [ ] Link Twitter works (via backend)
- [ ] Unlink Twitter works (via backend)
- [ ] Update fee works
- [ ] Withdraw fees works
- [ ] Search users works
- [ ] Filter matches works
- [ ] All forms validate input
- [ ] All errors display correctly
- [ ] Loading states show properly
- [ ] Success messages show
- [ ] Transaction receipts work

## Design System

### Colors

- Primary: Orange (#f97316)
- Success: Green (#10b981)
- Warning: Yellow (#f59e0b)
- Danger: Red (#ef4444)
- Info: Blue (#3b82f6)
- Purple: (#a855f7)

### Typography

- Header: Bold, 2xl-4xl
- Body: Regular, sm-base
- Mono: For addresses and IDs

### Spacing

- Card padding: 6-8 (1.5-2rem)
- Section gap: 6-8
- Component gap: 4
- Button padding: 3-4 vertical, 4-6 horizontal

### Components Style

- Rounded: xl (0.75rem)
- Border: 1px gray-700
- Backdrop: blur-xl
- Background: gray-800/50

## Next Steps

1. Complete Overview tab with stats
2. Complete Match Management tab
3. Add backend endpoints for user management
4. Implement Twitter linking UI
5. Add search and filter functionality
6. Create data tables component
7. Add pagination
8. Test all features end-to-end
9. Deploy to production
10. Monitor and iterate based on usage

---

**Current Status**: Basic structure created, needs completion
**Estimated Time**: 4-6 hours for full implementation
**Priority**: High - Essential for platform management
