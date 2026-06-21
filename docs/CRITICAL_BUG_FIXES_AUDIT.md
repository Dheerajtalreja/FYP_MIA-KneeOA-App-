# Critical Bug Fixes - Production Audit

**Date:** 2026-06-19  
**Issue:** Login crash and password reset deep link failures

---

## 🔴 Issue 1: Login Crash (404 Not Found)

### Root Cause Analysis

**File:** `src/services/api.js`  
**Lines:** 105-109 (handleResponse function)

**The Bug:**
```javascript
const handleResponse = async (response) => {
    if (!response.ok) {
        const error = await parseResponseBody(response).catch(() => ({}));
        const message = extractErrorMessage(error);
        throw new Error(message || `HTTP ${response.status}: Request failed`);
    }
    return parseResponseBody(response);
};
```

**Problem:** When the backend returns a JSON error body like `{"detail": "Not found"}`, the `extractErrorMessage()` function extracts `"Not found"` as the error message, **losing the "404" status code entirely**. 

Your 404 check `e.message?.includes('404')` fails because:
1. The error message is just `"Not found"`, not `"HTTP 404: Request failed"`
2. `e?.response?.status === 404` **never works** with native `fetch()` - it doesn't attach a `response` property to Error objects like Axios does

### The Fix

**File:** `src/services/api.js`  
**Lines:** 105-114

```javascript
const handleResponse = async (response) => {
    if (!response.ok) {
        const error = await parseResponseBody(response).catch(() => ({}));
        const message = extractErrorMessage(error);
        // Store status code on error object for downstream handling
        const errorObj = new Error(message || `HTTP ${response.status}: Request failed`);
        errorObj.status = response.status;
        errorObj.response = error;
        throw errorObj;
    }
    return parseResponseBody(response);
};
```

**Key Change:** Attach `status` and `response` properties to the Error object so downstream code can check `e.status === 404`.

---

**File:** `src/services/api.js`  
**Lines:** 210-260 (fetchCompleteUserProfile function)

**Before:**
```javascript
// Fetch user's questionnaire responses
let questionnaire = null;
try {
    questionnaire = await authFetch('/api/v1/user/questionnaire');
} catch (e) {
    // 404 is expected for new users with no questionnaire data
    if (e.message?.includes('404') || e?.response?.status === 404) {
        console.log('[Fetch-and-Sync] No questionnaire found (new user), setting to null');
        questionnaire = null;
    } else {
        console.warn('[Fetch-and-Sync] Failed to fetch questionnaire:', e.message);
        throw e;
    }
}
```

**After:**
```javascript
// Fetch user's questionnaire responses
let questionnaire = null;
try {
    questionnaire = await authFetch('/api/v1/user/questionnaire');
} catch (e) {
    // 404 is expected for new users with no questionnaire data
    // Check both error.status (from handleResponse) and e.message for backward compatibility
    if (e.status === 404 || e?.message?.includes('404')) {
        console.log('[Fetch-and-Sync] No questionnaire found (new user), setting to null');
        questionnaire = null;
    } else {
        console.warn('[Fetch-and-Sync] Failed to fetch questionnaire:', e.message);
        throw e;
    }
}
```

**Key Change:** Check `e.status === 404` instead of `e?.response?.status === 404` (which never works with native fetch).

---

## 🔴 Issue 2: Deep Link Token Loss

### Root Cause Analysis

**File:** `App.js`  
**Lines:** 28-65 (NavigationHandler)

**The Bug:**
```javascript
const handleDeepLink = async (url) => {
    try {
        const parsedUrl = Linking.parse(url);
        const path = parsedUrl.path || '';
        console.log('[DeepLink] Query params:', parsedUrl.queryParams);

        if (path.startsWith('/reset-password')) {
            const token = parsedUrl.queryParams?.token;
            // ...
        }
    }
};
```

**Problems:**
1. **URL Encoding Issues:** JWT tokens contain `+` signs, `%` characters, and other special characters that get URL-encoded. `Linking.parse()` may decode these incorrectly.
2. **No Token Validation:** The code doesn't validate that the extracted token is actually a valid JWT format (3 parts separated by dots).
3. **Query Parameter Loss:** If the token contains characters that get mangled during parsing, the token becomes invalid.

### The Fix

**File:** `App.js`  
**Lines:** 28-78

**Before:**
```javascript
const handleDeepLink = async (url) => {
    try {
        const parsedUrl = Linking.parse(url);
        const path = parsedUrl.path || '';
        console.log('[DeepLink] Query params:', parsedUrl.queryParams);

        if (path.startsWith('/reset-password')) {
            const token = parsedUrl.queryParams?.token;

            if (!token) {
                console.error('[DeepLink] No token found in URL');
                return;
            }

            console.log('[DeepLink] Token extracted:', token);
```

**After:**
```javascript
const handleDeepLink = async (url) => {
    try {
        console.log('[DeepLink] Received URL:', url);

        // CRITICAL FIX: Use URL API for robust query parameter extraction
        // This properly handles URL-encoded JWT tokens with +, %, etc.
        let parsedUrl;
        try {
            parsedUrl = new URL(url.replace('https://kneeoa.online', 'https://example.com'));
        } catch (e) {
            console.error('[DeepLink] Failed to parse URL:', url, e);
            return;
        }

        const path = parsedUrl.pathname;
        const token = parsedUrl.searchParams.get('token');

        console.log('[DeepLink] Path:', path);
        console.log('[DeepLink] Token length:', token?.length);
        console.log('[DeepLink] Token starts with:', token?.substring(0, 30) + '...');
        console.log('[DeepLink] Full token (first 100 chars):', token?.substring(0, 100));

        if (path.startsWith('/reset-password')) {
            if (!token || token.length === 0) {
                console.error('[DeepLink] No token found in URL');
                console.error('[DeepLink] All query params:', Array.from(parsedUrl.searchParams.entries()));
                return;
            }

            // Validate token format (JWT has 3 parts separated by dots)
            const parts = token.split('.');
            if (parts.length !== 3) {
                console.error('[DeepLink] Invalid token format - expected JWT with 3 parts');
                console.error('[DeepLink] Got parts:', parts.length);
                return;
            }

            console.log('[DeepLink] Token validated as JWT format');
```

**Key Changes:**
1. **Use URL API:** `new URL()` properly handles URL-encoded characters in query parameters
2. **Token Validation:** Check that the token has exactly 3 parts (JWT format)
3. **Enhanced Logging:** Log token length, first 100 characters, and all query params for debugging

---

**File:** `App.js`  
**Lines:** 135-145 (Linking Configuration)

**Before:**
```javascript
linking={{
    prefixes: [DEEP_LINK_PREFIX],
    config: {
        screens: {
            ResetPassword: 'reset-password',
        },
    },
}}
```

**After:**
```javascript
linking={{
    prefixes: [DEEP_LINK_PREFIX],
    config: {
        screens: {
            ResetPassword: {
                path: 'reset-password',
                parse: (path) => {
                    console.log('[Linking Config] Parsing path:', path);
                    // Return empty params - token comes from URL query string handled by NavigationHandler
                    return {};
                },
            },
        },
    },
}}
```

**Key Change:** Added custom `parse` function for detailed logging and to clarify that token extraction is handled by `NavigationHandler`.

---

**File:** `src/screens/ResetPasswordScreen.js`  
**Lines:** 17-42

**Before:**
```javascript
const ResetPasswordScreen = ({ navigation, route }) => {
    const resetToken = route?.params?.resetToken || null;
```

**After:**
```javascript
const ResetPasswordScreen = ({ navigation, route }) => {
    // CRITICAL FIX: Robust token extraction with URL decoding
    let resetToken = route?.params?.resetToken || null;
    
    // Handle case where token might be URL-encoded or in different format
    if (!resetToken && route?.params?.token) {
        console.log('[ResetPasswordScreen] Found token in route.params.token, using that');
        resetToken = route.params.token;
    }
    
    // Attempt URL decoding if token exists (handles + signs, %20, etc.)
    if (resetToken) {
        try {
            const decoded = decodeURIComponent(resetToken);
            if (decoded !== resetToken) {
                console.log('[ResetPasswordScreen] Token was URL-encoded, using decoded version');
                resetToken = decoded;
            }
        } catch (e) {
            console.log('[ResetPasswordScreen] Token appears to be already decoded or invalid encoding');
        }
    }
```

**Key Changes:**
1. **Multiple Parameter Sources:** Check both `resetToken` and `token` parameters
2. **URL Decoding:** Attempt to decode URL-encoded tokens (handles `+` signs, `%20`, etc.)
3. **Fallback Logic:** Gracefully handle already-decoded tokens

---

## 📋 Testing Checklist

### Test Issue 1 (Login):
1. ✅ Create a new user account
2. ✅ Log in with new user credentials
3. ✅ Verify login succeeds even though `/api/v1/user/questionnaire` returns 404
4. ✅ Verify dashboard loads with empty questionnaire state

### Test Issue 2 (Password Reset):
1. ✅ Request password reset from backend
2. ✅ Copy the deep link URL (e.g., `https://kneeoa.online/reset-password?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
3. ✅ Open the link from Android App Links
4. ✅ Verify token is extracted correctly (check console logs)
5. ✅ Verify JWT format validation passes (3 parts separated by dots)
6. ✅ Verify password reset screen loads without "Invalid Link" error

---

## 🚀 Deployment Notes

**Files Modified:**
- `src/services/api.js` - Fixed 404 error handling
- `App.js` - Fixed deep link token extraction
- `src/screens/ResetPasswordScreen.js` - Added robust token decoding

**No Breaking Changes:** All changes are backward compatible.

**Recommended:** Add comprehensive logging to monitor these fixes in production.
