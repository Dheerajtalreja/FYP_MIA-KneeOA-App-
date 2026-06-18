# Fetch-and-Sync Error Fixes

## Date: 2026-06-19

---

## Issues Fixed

### Issue 1: `ReferenceError: refresh is not defined` ✅

**Location:** `src/screens/LoginScreen.js` (line 125)

**Problem:** The variable `refresh` was being used in the `saveCompleteUserProfile` call but was never declared in the function scope. It was likely intended to use the refresh token from the login response.

**Before (Broken):**
```javascript
await saveCompleteUserProfile({
    ...completeProfile,
    user: {
        ...completeProfile.user,
        token,
        refreshToken: refresh, // ❌ 'refresh' is not defined!
    },
});
```

**After (Fixed):**
```javascript
await saveCompleteUserProfile({
    ...completeProfile,
    user: {
        ...completeProfile.user,
        token,
        refreshToken: result.user?.refreshToken || null, // ✅ Uses optional chaining
    },
});
```

**Solution:** Changed to use `result.user?.refreshToken` with optional chaining to safely extract the refresh token from the login response, defaulting to `null` if not present.

---

### Issue 2: `Unexpected token '<', "<!DOCTYPE "... is not valid JSON` ✅

**Location:** `src/services/api.js` - `fetchCompleteUserProfile()` function

**Problem:** The function was calling `.json()` on responses without checking:
1. If the HTTP status was OK
2. If the response content-type was actually JSON
3. Providing clear error messages when endpoints return HTML (404 pages, etc.)

This caused cryptic errors when FastAPI returned HTML error pages instead of JSON.

**Before (Broken):**
```javascript
const questionnaireResponse = await fetch('/api/v1/user/questionnaire', {
    headers: { Authorization: `Bearer ${authToken}` },
});
if (questionnaireResponse.ok) {
    questionnaire = await questionnaireResponse.json(); // ❌ Crashes if response is HTML
}
```

**After (Fixed):**
```javascript
const questionnaireResponse = await fetch('/api/v1/user/questionnaire', {
    headers: { Authorization: `Bearer ${authToken}` },
});

if (!questionnaireResponse.ok) {
    console.error(`[Fetch-and-Sync] Questionnaire request failed: ${questionnaireResponse.status} ${questionnaireResponse.statusText}`);
    console.error(`[Fetch-and-Sync] URL: /api/v1/user/questionnaire`);
    throw new Error(`Failed to fetch questionnaire: ${questionnaireResponse.status} ${questionnaireResponse.statusText}`);
}

// Check content-type before parsing JSON
const contentType = questionnaireResponse.headers.get('content-type');
if (contentType && contentType.includes('application/json')) {
    questionnaire = await questionnaireResponse.json();
} else {
    const text = await questionnaireResponse.text();
    console.error(`[Fetch-and-Sync] Expected JSON but got: ${contentType}`);
    console.error(`[Fetch-and-Sync] Response body (first 200 chars): ${text.substring(0, 200)}`);
    throw new Error(`Expected JSON response but received: ${contentType}`);
}
```

**Solution:** Added three-layer validation:
1. **HTTP Status Check** - Verify `response.ok` before parsing
2. **Content-Type Check** - Verify `content-type` header includes `application/json`
3. **Detailed Error Logging** - Print URL, status code, and response body for debugging

---

## Files Modified

### 1. `src/screens/LoginScreen.js`
- **Line 125:** Fixed `refreshToken: result.user?.refreshToken || null`
- **Impact:** Login flow now correctly saves refresh token from authentication response

### 2. `src/services/api.js`
- **Lines 223-242:** Enhanced questionnaire fetch with error handling
- **Lines 244-263:** Enhanced scan history fetch with error handling
- **Lines 265-284:** Enhanced recommendations fetch with error handling
- **Impact:** Clear error messages when endpoints fail, preventing cryptic JSON parse errors

---

## Error Handling Improvements

### New Error Messages Include:
✅ **HTTP Status Code** - e.g., `404 Not Found`, `500 Internal Server Error`  
✅ **HTTP Status Text** - e.g., `Not Found`, `Internal Server Error`  
✅ **Request URL** - e.g., `/api/v1/user/questionnaire`  
✅ **Content-Type** - e.g., `text/html`, `application/json`  
✅ **Response Body Preview** - First 200 characters of response  

### Example Error Output:
```
[Fetch-and-Sync] Questionnaire request failed: 404 Not Found
[Fetch-and-Sync] URL: /api/v1/user/questionnaire
[Fetch-and-Sync] Failed to fetch questionnaire: 404 Not Found
```

OR

```
[Fetch-and-Sync] Expected JSON but got: text/html; charset=utf-8
[Fetch-and-Sync] Response body (first 200 chars): <!DOCTYPE html><html><head><title>404 Not Found</title>...
[Fetch-and-Sync] Failed to fetch questionnaire: Expected JSON response but received: text/html; charset=utf-8
```

---

## Testing Checklist

### Test Login Flow
1. ✅ Clear app data/storage
2. ✅ Log in with valid credentials
3. ✅ Verify no `ReferenceError` occurs
4. ✅ Verify refresh token is saved
5. ✅ Verify navigation to Questionnaire screen

### Test Fetch-and-Sync Error Handling
1. **Test with valid endpoints:**
   - Verify all data (questionnaire, scans, recommendations) fetches correctly
   
2. **Test with invalid endpoints:**
   - Temporarily change endpoint URL to `/api/v1/user/nonexistent`
   - Verify clear error message with URL and status code
   - Verify app shows error screen instead of crashing

3. **Test with HTML responses:**
   - Configure backend to return HTML error page
   - Verify error message shows response body preview
   - Verify app handles error gracefully

---

## Next Steps for Debugging

If you still see JSON parse errors, check the console for:

1. **Status Code Errors** (4xx, 5xx):
   - Indicates backend endpoint issue
   - Check FastAPI router paths
   - Verify authentication token is valid

2. **Content-Type Errors** (expected JSON but got HTML):
   - Indicates backend returning error page instead of JSON
   - Check if FastAPI middleware is catching errors
   - Verify CORS headers if testing from different origin

3. **Network Errors** (failed to fetch):
   - Indicates connectivity issue
   - Check if backend server is running
   - Verify correct URL in `.env.local`

---

## Key Learnings

1. **Always check HTTP status before parsing JSON**
   - `response.ok` check prevents parsing error pages

2. **Validate content-type header**
   - Prevents cryptic "Unexpected token '<'" errors
   - Helps identify when backend returns HTML instead of JSON

3. **Provide detailed error context**
   - Include URL, status code, and response preview
   - Makes debugging much faster

4. **Use optional chaining for nested properties**
   - `result.user?.refreshToken` prevents crashes if user object is missing

---

*All fetch-and-sync errors fixed. App should now provide clear error messages when backend endpoints fail!* 🔧
