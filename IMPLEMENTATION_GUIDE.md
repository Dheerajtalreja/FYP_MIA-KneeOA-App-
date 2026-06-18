# Password Reset & State Synchronization Implementation Guide

## Overview
This document explains the two key fixes implemented to resolve:
1. **Password Reset Flow** - Deep link token capture and POST request execution
2. **State Synchronization** - Fetch-and-Sync pattern to prevent stale data

---

## Issue 1: Password Reset Flow Fix

### Problem
- App successfully launches from deep link but fails to capture the token
- POST request to `/api/v1/auth/reset-password` is not being sent

### Root Cause
The deep link handler in `App.js` was trying to navigate before the navigation container was ready, causing the token to be lost.

### Solution

#### 1. Updated `App.js` Deep Link Handler
**Location:** `App.js` - `NavigationHandler` component

**Key Changes:**
- Added `pendingLink` ref to store tokens when navigation isn't ready yet
- Added logging to track the deep link flow
- Implemented two-phase navigation:
  1. If navigation is ready → navigate immediately
  2. If navigation isn't ready → store token in `pendingLink` and process when ready

**Code Flow:**
```javascript
// When deep link arrives
Linking.getInitialURL() → handleDeepLink()
  ↓
Parse URL and extract token
  ↓
If navigation ready → navigate immediately
If not ready → store in pendingLink
  ↓
useEffect checks pendingLink when navigation becomes ready
  ↓
Navigate to ResetPassword screen with token
```

**Debug Logging Added:**
```javascript
console.log('[DeepLink] Parsed URL:', url);
console.log('[DeepLink] Token extracted:', token);
console.log('[DeepLink] Navigating to ResetPassword screen');
```

#### 2. Updated `ResetPasswordScreen.js`
**Location:** `src/screens/ResetPasswordScreen.js`

**Key Changes:**
- Added comprehensive logging to track token receipt
- Enhanced error handling with detailed error messages
- Added validation logging before API call

**Debug Logging Added:**
```javascript
console.log('[ResetPasswordScreen] Component mounted');
console.log('[ResetPasswordScreen] Reset token:', resetToken);
console.log('[ResetPasswordScreen] Sending reset password request...');
console.log('[ResetPasswordScreen] Success response:', response);
```

### Testing the Password Reset Flow

1. **Request password reset** from login screen
2. **Check email** for reset link (e.g., `https://kneeoa.online/reset-password?token=abc123`)
3. **Click the link** - app should launch
4. **Open console logs** to verify:
   ```
   [DeepLink] Initial URL: https://kneeoa.online/reset-password?token=abc123
   [DeepLink] Parsed URL: https://kneeoa.online/reset-password?token=abc123
   [DeepLink] Path: /reset-password
   [DeepLink] Query params: { token: 'abc123' }
   [DeepLink] Token extracted: abc123
   [DeepLink] Navigating to ResetPassword screen
   [ResetPasswordScreen] Component mounted
   [ResetPasswordScreen] Reset token: abc123
   ```
5. **Enter new password** and submit
6. **Verify API call** in logs:
   ```
   [ResetPasswordScreen] Sending reset password request...
   [ResetPasswordScreen] Token: abc123
   [ResetPasswordScreen] Password length: 12
   [ResetPasswordScreen] Success response: { success: true }
   ```

---

## Issue 2: Fetch-and-Sync Pattern

### Problem
- Local SQLite database shows stale/default data after login
- App ignores current data stored in backend
- Login process overwrites fresh server data with old local data

### Root Cause
The login flow was saving partial user data without first fetching the complete profile from the backend. Local data persisted and wasn't being refreshed.

### Solution: Fetch-and-Sync Pattern

#### Pattern Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                    LOGIN FLOW                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Authenticate → Get tokens from backend                 │
│         ↓                                                   │
│  2. Clear Local Data → Remove stale data from SQLite       │
│         ↓                                                   │
│  3. Fetch Complete Profile → Get ALL data from backend     │
│     (user, questionnaire, scans, recommendations)          │
│         ↓                                                   │
│  4. Save to Local DB → Store fresh server data             │
│         ↓                                                   │
│  5. Navigate → User sees fresh data                        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

#### Implementation Details

### 1. Added `clearLocalUserData()` Function
**Location:** `src/services/database.js`

```javascript
export const clearLocalUserData = async () => {
    const database = await getDatabase();
    
    // Clear all user-specific data
    await database.runAsync('DELETE FROM users');
    await database.runAsync('DELETE FROM questionnaire_responses');
    await database.runAsync('DELETE FROM scan_history');
    await database.runAsync('DELETE FROM recommendations');
    await database.runAsync('DELETE FROM sync_log');
    
    // Keep video references (static content)
};
```

**Purpose:** Removes all stale local data before syncing fresh data from backend.

### 2. Added `fetchCompleteUserProfile()` Function
**Location:** `src/services/api.js`

```javascript
export const fetchCompleteUserProfile = async () => {
    // Fetch user profile
    const profile = await fetchProfile();
    
    // Fetch questionnaire responses
    const questionnaire = await fetch('/api/v1/user/questionnaire', {
        headers: { Authorization: `Bearer ${authToken}` },
    });
    
    // Fetch scan history
    const scanHistory = await fetch('/api/v1/user/scans', {
        headers: { Authorization: `Bearer ${authToken}` },
    });
    
    // Fetch recommendations
    const recommendations = await fetch('/api/v1/user/recommendations', {
        headers: { Authorization: `Bearer ${authToken}` },
    });
    
    return {
        user: profile,
        questionnaire,
        scanHistory,
        recommendations,
        fetchedAt: new Date().toISOString(),
    };
};
```

**Purpose:** Fetches ALL user data from backend in one call. This is the "Source of Truth".

### 3. Added `saveCompleteUserProfile()` Function
**Location:** `src/services/database.js`

```javascript
export const saveCompleteUserProfile = async (completeProfile) => {
    const database = await getDatabase();
    
    await database.executeAsync(async (exec) => {
        // Save user
        await exec(`INSERT OR REPLACE INTO users ...`, [/* user data */]);
        
        // Save questionnaire
        if (completeProfile.questionnaire) {
            await exec(`INSERT OR REPLACE INTO questionnaire_responses ...`, [/* q data */]);
        }
        
        // Save scan history
        if (completeProfile.scanHistory) {
            for (const scan of completeProfile.scanHistory) {
                await exec(`INSERT OR REPLACE INTO scan_history ...`, [/* scan data */]);
            }
        }
        
        // Save recommendations
        if (completeProfile.recommendations) {
            for (const rec of completeProfile.recommendations) {
                await exec(`INSERT INTO recommendations ...`, [/* rec data */]);
            }
        }
    });
};
```

**Purpose:** Saves all fresh server data to local database in a single transaction.

### 4. Updated LoginScreen to Use Fetch-and-Sync
**Location:** `src/screens/LoginScreen.js`

**Before (Old Flow):**
```javascript
const handleLogin = async () => {
    const response = await loginUser(email, password);
    await saveUser({ /* partial data from login response */ });
    navigation.replace('Questionnaire');
};
```

**After (New Fetch-and-Sync Flow):**
```javascript
const handleLogin = async () => {
    // Step 1: Authenticate
    const authResponse = await loginUser(email, password);
    const token = authResponse.access_token;
    setAuthToken(token);
    
    // Step 2: Clear local data (remove stale data)
    await clearLocalUserData();
    
    // Step 3: Fetch complete profile from backend (Source of Truth)
    const completeProfile = await fetchCompleteUserProfile();
    
    // Step 4: Save fresh server data to local DB
    await saveCompleteUserProfile(completeProfile);
    
    // Step 5: Navigate
    navigation.replace('Questionnaire');
};
```

### Testing the Fetch-and-Sync Pattern

1. **Login with valid credentials**
2. **Check console logs:**
   ```
   [LoginScreen] Authenticating with backend...
   [LoginScreen] Authentication successful, fetching complete profile...
   [LoginScreen] Local data cleared
   [Fetch-and-Sync] Fetching complete user profile from backend...
   [LoginScreen] Complete profile fetched from backend
   [Database] Saving complete user profile...
   [Database] Complete user profile saved successfully
   [LoginScreen] Fresh server data saved to local database
   [LoginScreen] Login successful, navigating to Questionnaire
   ```

3. **Verify data freshness:**
   - Check that questionnaire data matches backend
   - Verify scan history is up-to-date
   - Confirm recommendations are current

---

## Key Benefits

### Password Reset Flow
✅ **Reliable token capture** - Token is stored if navigation isn't ready  
✅ **Comprehensive logging** - Easy to debug deep link issues  
✅ **Better error handling** - Clear error messages for users  

### Fetch-and-Sync Pattern
✅ **No stale data** - Local DB is cleared before each login  
✅ **Single source of truth** - Backend data always wins  
✅ **Atomic updates** - All data saved in one transaction  
✅ **Consistent state** - UI always shows fresh server data  

---

## Files Modified

1. **`App.js`** - Deep link handler with pending link support
2. **`src/screens/ResetPasswordScreen.js`** - Enhanced logging and error handling
3. **`src/services/api.js`** - Added `fetchCompleteUserProfile()` function
4. **`src/services/database.js`** - Added `clearLocalUserData()` and `saveCompleteUserProfile()`
5. **`src/screens/LoginScreen.js`** - Implemented Fetch-and-Sync pattern

---

## Backend API Endpoints Required

Ensure your FastAPI backend has these endpoints:

```
GET  /api/v1/profile/me          - Get user profile
GET  /api/v1/user/questionnaire  - Get user's questionnaire responses
GET  /api/v1/user/scans          - Get user's scan history
GET  /api/v1/user/recommendations - Get user's recommendations
POST /api/v1/auth/reset-password - Reset password with token
```

---

## Troubleshooting

### Deep Link Not Working
1. Check that `EXPO_PUBLIC_BACKEND_URL` matches your deep link domain
2. Verify `app.json` has correct `scheme` configuration
3. Check console logs for `[DeepLink]` messages
4. Test with `expo-linking` debugger: https://docs.expo.dev/router/tools/linking/#debugging

### Stale Data After Login
1. Verify `clearLocalUserData()` is being called
2. Check console logs for `[LoginScreen] Local data cleared`
3. Ensure backend endpoints are accessible
4. Verify `authToken` is set before fetching profile

### API Errors
1. Check network connectivity
2. Verify backend is running and accessible
3. Check CORS settings if testing from web
4. Ensure tokens are valid and not expired

---

## Next Steps

1. **Test thoroughly** with real backend
2. **Add offline support** - Cache data and sync when online
3. **Implement incremental sync** - Only fetch changed data
4. **Add error recovery** - Retry failed syncs automatically
5. **Monitor performance** - Profile fetch-and-sync timing

---

## Support

For issues or questions:
- Check console logs for `[DeepLink]`, `[LoginScreen]`, `[Fetch-and-Sync]`, `[Database]` prefixes
- Verify backend endpoints are working with tools like Postman
- Test deep links using Expo's link testing tools
