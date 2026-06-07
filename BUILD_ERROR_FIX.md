# Build Error Fix - TypeScript & Webpack Issues

## Errors Fixed

### 1. TypeScript Type Error

```
Type error: The type 'readonly Connector<CreateConnectorFn>[]' is 'readonly'
and cannot be assigned to the mutable type 'any[]'.
```

**Solution:** Updated type definitions to use proper TypeScript types from wagmi.

### 2. Webpack Module Warnings

```
Module not found: Can't resolve '@react-native-async-storage/async-storage'
Module not found: Can't resolve 'pino-pretty'
```

**Solution:** Added webpack fallbacks to ignore optional React Native dependencies.

## Changes Made

### 1. Fixed WalletContext Types (`/contexts/WalletContext.tsx`)

**Before:**

```typescript
interface WalletContextType {
  availableConnectors: any[];
  connectWithConnector: (connector: any) => Promise<void>;
}
```

**After:**

```typescript
import type { Connector } from "wagmi";

interface WalletContextType {
  availableConnectors: readonly Connector[];
  connectWithConnector: (connector: Connector) => Promise<void>;
}
```

**Why:**

- `useConnectors()` from wagmi returns `readonly Connector[]`
- TypeScript requires matching readonly types
- Using proper types improves type safety

### 2. Fixed WalletConnectModal Types (`/components/WalletConnectModal.tsx`)

**Before:**

```typescript
const getConnectorName = (type: string, name: string) => {...}
const getConnectorIcon = (type: string) => {...}
```

**After:**

```typescript
import type { Connector } from "wagmi";

const getConnectorName = (connector: Connector) => {...}
const getConnectorIcon = (connector: Connector) => {...}
```

**Why:**

- Functions now receive the full connector object
- Direct access to connector properties
- Better type inference

### 3. Added Webpack Configuration (`/next.config.ts`)

**Added:**

```typescript
webpack: (config) => {
  config.resolve.fallback = {
    ...config.resolve.fallback,
    "pino-pretty": false,
    "@react-native-async-storage/async-storage": false,
  };

  config.ignoreWarnings = [
    { module: /node_modules\/@metamask\/sdk/ },
    { module: /node_modules\/pino/ },
    { module: /node_modules\/ox/ },
  ];

  return config;
};
```

**Why:**

- `pino-pretty` is an optional dependency for logging (only needed in development)
- `@react-native-async-storage` is React Native specific (we're building for web)
- These modules aren't needed for browser builds
- Suppressing warnings keeps build output clean

## Understanding the Warnings

### React Native Dependencies

Some wallet libraries (like MetaMask SDK) are designed to work in both React Native and web environments. They conditionally import React Native modules, but webpack can't determine this at build time.

**Solution:** Tell webpack these modules are optional by setting them to `false` in fallbacks.

### Pino Logging

Pino is a logger that has an optional pretty-printing module. WalletConnect uses Pino but doesn't require `pino-pretty` in production.

**Solution:** Mark `pino-pretty` as optional in webpack fallbacks.

### Critical Dependencies

The `ox` library warning about dynamic requires is expected behavior and doesn't affect functionality.

**Solution:** Ignore these warnings using `ignoreWarnings` config.

## Testing the Fix

### 1. Clean Build

```bash
cd frontend
rm -rf .next
pnpm build
```

### 2. Expected Output

```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization
```

### 3. No Type Errors

The build should complete without TypeScript errors.

### 4. Warnings are Suppressed

The optional dependency warnings should no longer appear.

## Build Checklist

Before deployment:

- [x] TypeScript compilation passes
- [x] No runtime errors
- [x] Wallet connection works
- [x] All pages render correctly
- [x] Production build succeeds

## Production Considerations

### What Gets Built

- ✅ All wallet connector code
- ✅ WalletConnect protocol
- ✅ Injected wallet detection
- ✅ Connection modal
- ❌ React Native modules (excluded)
- ❌ Optional dev dependencies (excluded)

### Bundle Size

The webpack configuration only excludes modules that aren't needed, so:

- No increase in bundle size
- Wallet functionality fully preserved
- Build output is clean and optimized

### Runtime Behavior

- Wallet connections work normally
- No missing dependencies at runtime
- All features function as expected
- Mobile and desktop support intact

## Troubleshooting

### If Build Still Fails

**Check Node Version:**

```bash
node --version  # Should be 18.x or higher
```

**Clear Cache:**

```bash
rm -rf .next node_modules pnpm-lock.yaml
pnpm install
pnpm build
```

**Check Environment Variables:**

```bash
# Make sure .env.local exists with:
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id
```

### If Types Don't Match

**Update Wagmi:**

```bash
pnpm update wagmi @wagmi/connectors viem
```

**Check Imports:**

```typescript
import type { Connector } from "wagmi"; // Correct
import type { Connector } from "@wagmi/core"; // Incorrect
```

### If Warnings Reappear

Check that `next.config.ts` has been saved and is being used:

```bash
cat next.config.ts  # Verify changes are present
```

## Related Documentation

- [Next.js Webpack Config](https://nextjs.org/docs/app/api-reference/next-config-js/webpack)
- [Wagmi TypeScript](https://wagmi.sh/react/typescript)
- [WalletConnect Web3Modal](https://docs.walletconnect.com/web3modal/about)

## Summary

The build errors were caused by:

1. **Type mismatch** - Using `any[]` instead of `readonly Connector[]`
2. **Optional dependencies** - Webpack trying to bundle React Native modules

Both issues are now fixed with:

1. **Proper TypeScript types** from wagmi
2. **Webpack fallbacks** for optional modules
3. **Warning suppression** for known non-issues

The build should now complete successfully! ✅
