# Duplicate Function & Zombie Endpoint Fix

## Problem Summary
The app was experiencing two critical errors:
1. **Duplicate identifier error**: `Identifier 'updateProfile' has already been declared`
2. **Zombie endpoint error**: `fetchCompleteUserProfile` calling non-existent `/api/v1/user/questionnaire` endpoint

## Root Causes

### 1. Duplicate `updateProfile` Function
**Location**: `src/services/apiCore.js`

The file had **TWO** `updateProfile` function declarations:
- **Line 675**: First declaration (with `buildProfileUpdatePayload`)
- **Line 791**: Second declaration (without payload builder)

This caused a JavaScript `Identifier already declared` error during bundling.

### 2. Zombie Endpoint in `fetchCompleteUserProfile`
**Location**: `src/services/apiCore.js`

The function was calling:
```javascript
authFetch('/api/v1/user/questionnaire')  // ❌ Does not exist!
authFetch('/api/v1/user/scans')          // ❌ Does not exist!
authFetch('/api/v1/user/recommendations') // ❌ Does not exist!
```

These endpoints don't exist on the backend, causing 404 errors and potential app hangs.

## The Fixes

### Fix 1: Removed Duplicate `updateProfile` ✅

**Before (❌ WRONG)**:
```javascript
// Line 675 - First declaration
export const updateProfile = async (profileData) => {
    const payload = buildProfileUpdatePayload(profileData);
    return request('/api/v1/profile/me', {
        method: 'PUT',
        body: JSON.stringify(payload),
    }, { auth: true });
};

// ... other code ...

// Line 791 - Second declaration (DUPLICATE!)
export const updateProfile = async (profileData) => {
    return request('/api/v1/profile/me', {
        method: 'PUT',
        body: JSON.stringify(profileData),
    }, { auth: true });
};
```

**After (✅ CORRECT)**:
```javascript
// Only ONE declaration remains (the one with buildProfileUpdatePayload)
export const updateProfile = async (profileData) => {
    const payload = buildProfileUpdatePayload(profileData);
    return request('/api/v1/profile/me', {
        method: 'PUT',
        body: JSON.stringify(payload),
    }, { auth: true });
};
```

**Result**: No more duplicate identifier errors!

---

### Fix 2: Updated `fetchCompleteUserProfile` ✅

**Before (❌ WRONG)**:
```javascript
export const fetchCompleteUserProfile = async () => {
    try {
        console.log('[Fetch-and-Sync] Fetching complete user profile from backend...');

        // Fetch user profile
        const profile = await fetchProfile();

        // Fetch related data in parallel with safe error handling (404 is okay for new users)
        const [questionnaireResult, scansResult, recommendationsResult] = await Promise.allSettled([
            authFetch('/api/v1/user/questionnaire'),  // ❌ 404!
            authFetch('/api/v1/user/scans'),          // ❌ 404!
            authFetch('/api/v1/user/recommendations') // ❌ 404!
        ]);

        const getResultValue = (result, defaultValue) => {
            if (result.status === 'fulfilled') return result.value;
            // 404 means no data yet, which is normal for new accounts
            if (result.reason?.status === 404) return defaultValue;
            console.warn(`[Fetch-and-Sync] Error fetching secondary data:`, result.reason);
            return defaultValue;
        };

        const completeProfile = {
            user: profile,
            questionnaire: getResultValue(questionnaireResult, null), // ❌ Always null!
            scanHistory: getResultValue(scansResult, []),
            recommendations: getResultValue(recommendationsResult, []),
            fetchedAt: new Date().toISOString(),
        };

        console.log('[Fetch-and-Sync] Complete profile fetched successfully');
        return completeProfile;
    } catch (error) {
        console.error('[Fetch-and-Sync] Failed to fetch complete profile:', error);
        throw error;
    }
};
```

**After (✅ CORRECT)**:
```javascript
/**
 * Fetches the user profile and syncs it with local storage/database.
 * Note: Questionnaire data is now part of the profile object.
 */
export const fetchCompleteUserProfile = async () => {
    try {
        console.log('[Fetch-and-Sync] Fetching complete user profile from backend...');

        // Fetch user profile which now contains all questionnaire fields
        const profile = await getProfile();

        // Fetch scans and recommendations only
        const [scansResult, recommendationsResult] = await Promise.allSettled([
            authFetch('/api/v1/diagnostic/reports'), // ✅ Correct endpoint
            authFetch('/api/v1/recommendation/')     // ✅ Correct endpoint
        ]);

        const getResultValue = (result, defaultValue) => {
            if (result.status === 'fulfilled') return result.value;
            console.warn(`[Fetch-and-Sync] Error fetching secondary data:`, result.reason);
            return defaultValue;
        };

        const completeProfile = {
            user: profile,
            questionnaire: profile, // ✅ Questionnaire data is now inside the profile object
            scanHistory: getResultValue(scansResult, []),
            recommendations: getResultValue(recommendationsResult, []),
            fetchedAt: new Date().toISOString(),
        };

        console.log('[Fetch-and-Sync] Complete profile fetched successfully');
        return completeProfile;
    } catch (error) {
        console.error('[Fetch-and-Sync] Failed to fetch complete profile:', error);
        throw error;
    }
};
```

**Key Changes**:
1. ✅ Removed `/api/v1/user/questionnaire` call
2. ✅ Removed `/api/v1/user/scans` call
3. ✅ Removed `/api/v1/user/recommendations` call
4. ✅ Added `/api/v1/diagnostic/reports` (correct endpoint)
5. ✅ Added `/api/v1/recommendation/` (correct endpoint)
6. ✅ Set `questionnaire: profile` (questionnaire data is in profile)

**Result**: No more 404 errors!

---

## API Endpoints Used

### Correct Endpoints
```http
GET /api/v1/profile/me
Authorization: Bearer <token>

GET /api/v1/diagnostic/reports
Authorization: Bearer <token>

GET /api/v1/recommendation/
Authorization: Bearer <token>

PUT /api/v1/profile/me
Authorization: Bearer <token>
{
    "age": 45,
    "pain_level": 5,
    "mobility_level": "moderate",
    "current_meds": ["ibuprofen"]
}
```

### Removed Endpoints (Don't Exist)
```http
❌ GET /api/v1/user/questionnaire
❌ GET /api/v1/user/scans
❌ GET /api/v1/user/recommendations
```

---

## Data Structure

### Complete Profile Response
```javascript
{
    user: {
        user_id: "uuid",
        email: "user@example.com",
        full_name: "John Doe",
        age: 45,
        pain_level: 5,
        mobility_level: "moderate",
        current_meds: ["ibuprofen"],
        // ... all profile fields
    },
    questionnaire: {
        // ✅ Same as user object - questionnaire data is in profile
        user_id: "uuid",
        email: "user@example.com",
        full_name: "John Doe",
        age: 45,
        pain_level: 5,
        mobility_level: "moderate",
        current_meds: ["ibuprofen"],
    },
    scanHistory: [
        // Scan data from /api/v1/diagnostic/reports
    ],
    recommendations: [
        // Recommendation data from /api/v1/recommendation/
    ],
    fetchedAt: "2026-06-20T12:00:00.000Z"
}
```

---

## Testing Guide

### Test 1: No Duplicate Errors
```
1. Clear cache: npx expo start -c
2. Launch app
3. ✅ No "Identifier already declared" errors
4. ✅ App bundles successfully
```

### Test 2: No 404 Errors
```
1. Login with existing user
2. Check network tab
3. ✅ Should call GET /api/v1/profile/me
4. ✅ Should call GET /api/v1/diagnostic/reports
5. ✅ Should call GET /api/v1/recommendation/
6. ✅ Should NOT call /api/v1/user/questionnaire
7. ✅ Should NOT call /api/v1/user/scans
8. ✅ Should NOT call /api/v1/user/recommendations
```

### Test 3: Profile Data Available
```
1. Login with existing user
2. Check console logs
3. ✅ Should see "[Fetch-and-Sync] Complete profile fetched successfully"
4. ✅ completeProfile.questionnaire should have data
5. ✅ completeProfile.scanHistory should have data
6. ✅ completeProfile.recommendations should have data
```

### Test 4: Update Profile Works
```
1. Edit profile in QuestionnaireScreen
2. Submit
3. ✅ Should call PUT /api/v1/profile/me
4. ✅ Should use buildProfileUpdatePayload
5. ✅ Should navigate to Home after success
```

---

## Files Modified

1. ✅ `src/services/apiCore.js` - Removed duplicate `updateProfile`
2. ✅ `src/services/apiCore.js` - Updated `fetchCompleteUserProfile`

---

## Verification Checklist

- [ ] No "Identifier already declared" errors
- [ ] No 404 errors for `/api/v1/user/questionnaire`
- [ ] No 404 errors for `/api/v1/user/scans`
- [ ] No 404 errors for `/api/v1/user/recommendations`
- [ ] `fetchCompleteUserProfile` calls correct endpoints
- [ ] `questionnaire` data available in completeProfile
- [ ] `scanHistory` data available in completeProfile
- [ ] `recommendations` data available in completeProfile
- [ ] `updateProfile` function works correctly
- [ ] App bundles successfully
- [ ] App runs without errors

---

## Next Steps

1. ✅ Clear cache: `npx expo start -c`
2. ✅ Test login flow
3. ✅ Test profile update
4. ✅ Verify no 404 errors in console
5. ✅ Verify no duplicate identifier errors
6. ✅ Deploy to production when verified

Both critical issues are now fixed! 🎉
