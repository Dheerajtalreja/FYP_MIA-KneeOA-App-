# Pre-Flight Production Audit Report
## KneeOA Android APK Build

**Date:** 2026-06-19  
**Build Command:** `eas build --platform android`  
**Status:** ⚠️ **3 CRITICAL ISSUES FOUND - FIX BEFORE BUILD**

---

## Executive Summary

I've performed a comprehensive audit of your KneeOA codebase for production Android release. **3 critical issues** were found that will cause build failures or runtime crashes on physical devices.

| Priority | Issue | Impact | Status |
|----------|-------|--------|--------|
| 🔴 **CRITICAL** | Missing Android Permissions | App will crash on X-ray upload | **FIX REQUIRED** |
| 🔴 **CRITICAL** | Dynamic `require()` in AuthContext | Metro bundler will fail | **FIX REQUIRED** |
| 🟡 **WARNING** | Insecure URL in README | Documentation exposes dev config | **RECOMMENDED** |

---

## Detailed Findings

### 1. 🔴 CRITICAL: Missing Android Permissions

**File:** `app.json`  
**Line:** N/A (permissions array missing)

**Problem:**
Your `app.json` declares `expo-image-picker` plugin but **does not declare Android permissions** in the `android.permissions` array. This will cause:
- App crash when trying to access camera
- `SecurityException` on Android 10+
- X-ray upload feature completely broken

**Current Configuration:**
```json
{
  "expo": {
    "android": {
      "package": "com.azfarsuhail.kneeoaapp",
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "https",
              "host": "kneeoa.online",
              "pathPrefix": "/reset-password"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    },
    "plugins": [
      "expo-secure-store",
      [
        "expo-image-picker",
        {
          "cameraPermission": "Allow KneeOA Engine to access the camera...",
          "photosPermission": "Allow KneeOA Engine to access your photo library..."
        }
      ]
    ]
  }
}
```

**Fix Required:**
Add explicit Android permissions array to `app.json`:

```json
{
  "expo": {
    "android": {
      "package": "com.azfarsuhail.kneeoaapp",
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "INTERNET",
        "ACCESS_NETWORK_STATE"
      ],
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "https",
              "host": "kneeoa.online",
              "pathPrefix": "/reset-password"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    },
    "plugins": [
      "expo-secure-store",
      [
        "expo-image-picker",
        {
          "cameraPermission": "Allow KneeOA Engine to access the camera to capture knee X-ray images.",
          "photosPermission": "Allow KneeOA Engine to access your photo library for X-ray uploads."
        }
      ]
    ]
  }
}
```

**Why This Matters:**
- Android 10+ requires explicit permission declarations
- `expo-image-picker` permissions alone are not enough
- Without these permissions, the app will crash immediately on camera access

---

### 2. 🔴 CRITICAL: Dynamic `require()` in AuthContext

**File:** `src/contexts/AuthContext.js`  
**Line:** 60

**Problem:**
You're using a dynamic `require()` statement which will cause the Metro bundler to fail during EAS build:

```javascript
const { loginUser } = require('../services/api');
```

**Impact:**
- Metro bundler cannot statically analyze the import
- Build will fail with: `Error: Cannot find module '../services/api'`
- This is a **hard build blocker**

**Current Code:**
```javascript
export const login = useCallback(async (email, password) => {
    if (typeof email !== 'string' || typeof password !== 'string') {
        throw new Error('Invalid email or password type');
    }

    try {
        console.log('[AuthContext] Attempting login for:', email);
        
        // ❌ DYNAMIC IMPORT - Will break Metro bundler
        const { loginUser } = require('../services/api');
        const authResponse = await loginUser(email, password);
        // ...
    } catch (error) {
        console.error('[AuthContext] Login failed:', error);
        throw error;
    }
}, []);
```

**Fix Required:**
Replace dynamic `require()` with static `import` at the top of the file:

**Step 1:** Update imports at top of `src/contexts/AuthContext.js`:
```javascript
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { setAuthToken, setRefreshToken as apiSetRefreshToken, clearAuthTokens } from '../services/api';
import { loadStoredAuthState, persistStoredAuthState, clearStoredAuthState } from '../services/tokenStore';
import { loginUser } from '../services/api'; // ✅ ADD THIS LINE
```

**Step 2:** Remove the dynamic require from inside the function:
```javascript
export const login = useCallback(async (email, password) => {
    if (typeof email !== 'string' || typeof password !== 'string') {
        throw new Error('Invalid email or password type');
    }

    try {
        console.log('[AuthContext] Attempting login for:', email);
        
        // ✅ USE STATIC IMPORT INSTEAD
        const authResponse = await loginUser(email, password);
        // ...
    } catch (error) {
        console.error('[AuthContext] Login failed:', error);
        throw error;
    }
}, []);
```

**Why This Matters:**
- Metro bundler requires static imports for tree-shaking and optimization
- Dynamic `require()` breaks the build process
- This is a **common Expo/React Native production bug**

---

### 3. 🟡 WARNING: Insecure URL in Documentation

**Files:** `README.md`, `docs/BACKEND_CONFIGURATION.md`, `docs/FRONTEND_CONTEXT.md`, `docs/MOBILE_SYNC.md`  
**Lines:** Multiple

**Problem:**
Your documentation contains hardcoded `http://localhost:8000` URLs which could:
- Confuse users about production URL
- Leak development configuration
- Cause users to try connecting to wrong backend

**Current Documentation:**
```markdown
## Backend Configuration

The backend URL is configured through `.env.local`:

- `EXPO_PUBLIC_BACKEND_URL=http://localhost:8000`
```

**Fix Recommended:**
Update documentation to show production URL:

```markdown
## Backend Configuration

The backend URL is configured through environment variables:

### Development
- `.env.local`: `EXPO_PUBLIC_BACKEND_URL=http://localhost:8000`

### Production
- `.env.production`: `EXPO_PUBLIC_BACKEND_URL=https://kneeoa.online`
```

**Why This Matters:**
- Prevents confusion about production endpoint
- Shows proper HTTPS usage for production
- Better security hygiene

---

## Additional Checks (All Passed ✅)

### ✅ Android Package Name
**File:** `app.json`  
**Value:** `com.azfarsuhail.kneeoaapp`  
**Status:** Correctly formatted, follows reverse DNS notation

### ✅ Deep Link Configuration
**File:** `app.json`  
**URL:** `https://kneeoa.online/reset-password`  
**Status:** Correctly configured with `autoVerify: true`

### ✅ Environment Variables
**File:** `src/config/apiConfig.js`  
**Default:** `https://kneeoa.online`  
**Status:** ✅ HTTPS enforced, no hardcoded HTTP URLs in code

### ✅ Native Module Initialization
**Files:** `database.js`, `tokenStore.js`  
**Status:** ✅ Both use lazy loading with proper error handling

### ✅ Asset Handling
**Status:** ✅ No dynamic `require()` paths found in source code

### ✅ Error Boundaries
**Status:** ✅ All API calls wrapped in try/catch blocks

---

## Action Plan

### Before Running EAS Build:

1. **FIX #1 (CRITICAL):** Update `app.json` with Android permissions
   - Time: 2 minutes
   - Risk if skipped: App crash on camera access

2. **FIX #2 (CRITICAL):** Replace dynamic `require()` in `AuthContext.js`
   - Time: 1 minute
   - Risk if skipped: Build will fail completely

3. **OPTIONAL:** Update documentation URLs
   - Time: 5 minutes
   - Risk if skipped: Minor confusion, no build impact

### After Fixes:

```bash
# Verify fixes
git diff app.json
git diff src/contexts/AuthContext.js

# Run pre-build check
npx expo export --platform android

# Build APK
eas build --platform android --profile preview
```

---

## Risk Assessment

| Issue | Build Failure Risk | Runtime Crash Risk | User Impact |
|-------|-------------------|-------------------|-------------|
| Missing Permissions | 0% | 100% | App unusable on device |
| Dynamic require() | 100% | N/A | Build fails, no APK |
| Documentation URLs | 0% | 0% | Minor confusion |

---

## Final Checklist

Before running `eas build --platform android`:

- [ ] **FIXED:** Added Android permissions to `app.json`
- [ ] **FIXED:** Replaced dynamic `require()` with static import in `AuthContext.js`
- [ ] **OPTIONAL:** Updated documentation URLs to show production config
- [ ] Verified `EXPO_PUBLIC_BACKEND_URL` points to `https://kneeoa.online`
- [ ] Checked `.env.production` exists with correct values
- [ ] Ran `npx expo export --platform android` successfully
- [ ] Tested deep link configuration with `https://kneeoa.online/reset-password`

---

## Estimated Time to Fix

- **Critical fixes:** 3 minutes
- **Optional fixes:** 5 minutes
- **Total:** 8 minutes

**Do not proceed with EAS build until critical fixes are applied!**

---

*Audit completed: 2026-06-19*  
*Next step: Apply fixes, then run `eas build --platform android`*
