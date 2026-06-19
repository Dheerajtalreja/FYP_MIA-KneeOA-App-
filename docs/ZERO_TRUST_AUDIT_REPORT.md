# 🔴 ZERO-TRUST PRODUCTION AUDIT REPORT
**Date:** 2026-06-19  
**Scope:** Complete React Native (Expo) codebase audit  
**Status:** CRITICAL ISSUES FOUND - DO NOT BUILD YET

---

## 🚨 RED FLAG #1: Native `fetch()` Trap - DUPLICATE ERROR HANDLING

### **Issue:** `apiCore.js` has its own error handling that may conflict with `api.js`

**File:** `src/services/apiCore.js`  
**Lines:** 171-205

**The Bug:**
```javascript
const mapErrorResponse = async (response) => {
    const payload = await parseResponseBody(response).catch(() => null);

    if (response.status === 401) {
        clearAuthTokens();
        const error = new UnauthorizedError();  // ❌ No status attached
        if (sessionExpiredHandler) {
            sessionExpiredHandler(error);
        }
        return error;
    }

    if (response.status === 403) {
        return new ForbiddenError();  // ❌ No status attached
    }

    if (response.status === 404) {
        return new NotFoundError();  // ❌ No status attached
    }

    if (response.status === 422) {
        const detail = Array.isArray(payload?.detail) ? payload.detail : [];
        return new ValidationError(genericMessageForStatus(422), {
            details: detail,
            fieldErrors: buildFieldErrors(detail),
            raw: payload,
        });  // ❌ No status attached
    }

    const details = payload && typeof payload === 'object' ? payload : null;
    return new ApiError(genericMessageForStatus(response.status), {
        status: response.status,  // ✅ Only this one has status
        details,
        raw: payload,
    });
};
```

**Problem:** The `UnauthorizedError`, `ForbiddenError`, and `NotFoundError` are created **without** the `status` parameter, so downstream code checking `error.status === 404` will fail.

### **The Fix:**

✅ **FIXED:** Updated `apiCore.js` to attach status codes to all error types.

---

## 🚨 RED FLAG #2: AuthContext Race Conditions & Memory Leaks

### **Issue:** Deep link listener runs BEFORE AuthContext finishes loading

**File:** `App.js`  
**Lines:** 28-95 (NavigationHandler)  
**File:** `src/contexts/AuthContext.js`  
**Lines:** 30-50 (loadAuthState)

**The Bug:**
```javascript
// App.js - Deep link listener starts IMMEDIATELY
useEffect(() => {
    const handleDeepLink = async (url) => {
        // ... extracts token ...
        if (navigationRef?.isReady()) {
            navigationRef.navigate('ResetPassword', { resetToken: token });
        }
    };

    Linking.getInitialURL().then((url) => {
        if (url) {
            handleDeepLink(url);  // ❌ Runs immediately, may be before AuthContext loads
        }
    });
```

```javascript
// AuthContext.js - Auth state loads SLOWLY
useEffect(() => {
    const loadAuthState = async () => {
        const state = await loadStoredAuthState();  // ❌ Async operation
        // ...
    };
    loadAuthState();
}, []);
```

**Problem:**
1. Deep link listener starts **immediately** on component mount
2. AuthContext loads stored tokens **asynchronously** (can take 100-500ms)
3. If a deep link opens the app while AuthContext is still loading:
   - The deep link token is extracted correctly
   - BUT the navigation may happen before the app is fully authenticated
   - This can cause the user to land on a protected screen without proper auth state

### **The Fix:**

**File:** `App.js` (Lines 28-95)

**Current Code:**
```javascript
useEffect(() => {
    const handleDeepLink = async (url) => {
        try {
            console.log('[DeepLink] Received URL:', url);
            let parsedUrl;
            try {
                parsedUrl = new URL(url.replace('https://kneeoa.online', 'https://example.com'));
            } catch (e) {
                console.error('[DeepLink] Failed to parse URL:', url, e);
                return;
            }

            const path = parsedUrl.pathname;
            const token = parsedUrl.searchParams.get('token');
            // ... validation ...

            if (navigationRef?.isReady()) {
                navigationRef.navigate('ResetPassword', { resetToken: token });
            } else {
                pendingLink.current = { resetToken: token, timestamp: Date.now() };
            }
        } catch (error) {
            console.error('[DeepLink] Failed to parse deep link:', error);
        }
    };

    Linking.getInitialURL().then((url) => {
        if (url) {
            handleDeepLink(url);  // ❌ No wait for AuthContext
        }
    });
```

**Fixed Code:**
```javascript
useEffect(() => {
    let authContextReady = false;
    const authReadyPromise = new Promise((resolve) => {
        // We'll set authContextReady = true when AuthContext finishes loading
        // This requires a callback from AuthContext
    });

    const handleDeepLink = async (url) => {
        try {
            console.log('[DeepLink] Received URL:', url);
            let parsedUrl;
            try {
                parsedUrl = new URL(url.replace('https://kneeoa.online', 'https://example.com'));
            } catch (e) {
                console.error('[DeepLink] Failed to parse URL:', url, e);
                return;
            }

            const path = parsedUrl.pathname;
            const token = parsedUrl.searchParams.get('token');
            // ... validation ...

            // ✅ Wait for both navigation AND auth to be ready
            if (navigationRef?.isReady() && authContextReady) {
                navigationRef.navigate('ResetPassword', { resetToken: token });
            } else {
                pendingLink.current = { resetToken: token, timestamp: Date.now() };
                console.log('[DeepLink] Waiting for auth context to be ready...');
            }
        } catch (error) {
            console.error('[DeepLink] Failed to parse deep link:', error);
        }
    };

    Linking.getInitialURL().then((url) => {
        if (url) {
            handleDeepLink(url);
        }
    });
```

**Additional Fix Required in AuthContext.js:**

**File:** `src/contexts/AuthContext.js` (Lines 30-50)

**Current Code:**
```javascript
useEffect(() => {
    const loadAuthState = async () => {
        try {
            console.log('[AuthContext] Loading stored auth state...');
            const state = await loadStoredAuthState();
            // ...
        } finally {
            setIsLoading(false);
        }
    };
    loadAuthState();
}, []);
```

**Fixed Code:**
```javascript
const [isAuthenticated, setIsAuthenticated] = useState(false);
const [isLoading, setIsLoading] = useState(true);
const [authReady, setAuthReady] = useState(false);  // ✅ NEW: Track auth readiness
const [user, setUser] = useState(null);
// ...

useEffect(() => {
    const loadAuthState = async () => {
        try {
            console.log('[AuthContext] Loading stored auth state...');
            const state = await loadStoredAuthState();
            // ...
        } finally {
            setIsLoading(false);
            setAuthReady(true);  // ✅ Signal that auth is ready
        }
    };
    loadAuthState();
}, []);
```

**Then in App.js, you need to subscribe to auth readiness:**

```javascript
// Add a ref to track auth readiness
const authReadyRef = useRef(false);

// Create a callback that AuthContext can call when ready
const handleAuthReady = useCallback(() => {
    authReadyRef.current = true;
    console.log('[App] AuthContext is now ready');
    
    // Process any pending deep links
    if (pendingLink.current && navigationRef?.isReady()) {
        console.log('[App] Processing pending deep link after auth ready');
        const { resetToken } = pendingLink.current;
        navigationRef.navigate('ResetPassword', { resetToken });
        pendingLink.current = null;
    }
}, [navigationRef]);

// Pass this callback to AuthContext via context or prop
```

---

## 🚨 RED FLAG #3: Unhandled Promise Rejections

### **Issue:** Multiple screens have async operations without proper try/catch

**File:** `src/screens/HomeScreen.js`  
**Lines:** 95-115

**The Bug:**
```javascript
const loadDashboardData = useCallback(async () => {
    try {
        const user = await getUser();
        // ...
        
        const [scanRows, reports] = await Promise.all([
            database.getAllAsync(...),
            fetchReports().catch(() => []),  // ✅ Has catch
        ]);
```

**Problem:** `database.getAllAsync()` is **NOT wrapped in try/catch**. If the database query fails (corrupted DB, permission issues), the entire app will crash.

### **The Fix:**

**File:** `src/screens/HomeScreen.js` (Lines 95-115)

**Current Code:**
```javascript
const loadDashboardData = useCallback(async () => {
    try {
        const user = await getUser();
        const userKey = user?.server_id || user?.email || user?.id || 'current_user';
        setUserName(user?.full_name || user?.email || 'Dr. User');

        const database = await getDatabase();
        const [scanRows, reports] = await Promise.all([
            database.getAllAsync(
                'SELECT * FROM scan_history WHERE user_id = ? ORDER BY scanned_at DESC',
                [userKey]
            ),
            fetchReports().catch(() => []),
        ]);
```

**Fixed Code:**
```javascript
const loadDashboardData = useCallback(async () => {
    try {
        const user = await getUser();
        const userKey = user?.server_id || user?.email || user?.id || 'current_user';
        setUserName(user?.full_name || user?.email || 'Dr. User');

        const database = await getDatabase();
        
        // ✅ Wrap database query in try/catch
        const [scanRows, reports] = await Promise.all([
            database.getAllAsync(
                'SELECT * FROM scan_history WHERE user_id = ? ORDER BY scanned_at DESC',
                [userKey]
            ).catch((err) => {
                console.error('[HomeScreen] Database query failed:', err);
                return [];  // Return empty array on error
            }),
            fetchReports().catch(() => []),
        ]);
```

---

**File:** `src/screens/QuestionnaireScreen.js`  
**Lines:** 80-115

**The Bug:**
```javascript
const handleComplete = async () => {
    setLoading(true);
    try {
        const currentUser = await getUser();
        const userId = currentUser?.server_id || currentUser?.email || currentUser?.id || 'current_user';
        const localQuestionnaireId = await saveQuestionnaireResponse({ ...formData, userId });
        // ...
        
        try {
            await updateProfile({...});
        } catch (uploadError) {
            console.warn('Profile update skipped:', uploadError.message);  // ✅ Has catch
        }
    } catch (error) {
        console.error('Failed to save questionnaire:', error);  // ❌ Only logs, doesn't show error UI
    } finally {
        setLoading(false);
    }
};
```

**Problem:** The outer catch block only logs the error but doesn't show an error UI or prevent navigation. User might think the questionnaire saved successfully when it actually failed.

### **The Fix:**

**File:** `src/screens/QuestionnaireScreen.js` (Lines 80-115)

**Current Code:**
```javascript
const handleComplete = async () => {
    setLoading(true);
    try {
        const currentUser = await getUser();
        const userId = currentUser?.server_id || currentUser?.email || currentUser?.id || 'current_user';
        const localQuestionnaireId = await saveQuestionnaireResponse({ ...formData, userId });
        // ...
    } catch (error) {
        console.error('Failed to save questionnaire:', error);
    } finally {
        setLoading(false);
    }
};
```

**Fixed Code:**
```javascript
const handleComplete = async () => {
    setLoading(true);
    try {
        const currentUser = await getUser();
        const userId = currentUser?.server_id || currentUser?.email || currentUser?.id || 'current_user';
        const localQuestionnaireId = await saveQuestionnaireResponse({ ...formData, userId });
        // ...
        
        try {
            await updateProfile({...});
        } catch (uploadError) {
            console.warn('Profile update skipped:', uploadError.message);
        }

        navigation.replace('Home', {
            questionnaireId: localQuestionnaireId,
            clinicalProfile: {...},
        });
    } catch (error) {
        console.error('Failed to save questionnaire:', error);
        Alert.alert(
            'Save Failed',
            'We could not save your responses. Please check your connection and try again.',
            [
                { text: 'Try Again', onPress: () => setLoading(false) },
                { text: 'Cancel', style: 'cancel' },
            ]
        );
    } finally {
        setLoading(false);
    }
};
```

---

## 🚨 RED FLAG #4: AsyncStorage / SecureStore Blocking

### **Issue:** No blocking detected - all storage operations are async ✅

**Analysis:**
- `SecureStore.getItemAsync()` and `SecureStore.setItemAsync()` are **async** ✅
- `database.getAllAsync()` is **async** ✅
- All storage operations are properly awaited ✅

**Status:** ✅ **ALL CLEAR** - No blocking synchronous storage operations found.

---

## 🚨 RED FLAG #5: Promise.all Without Error Handling

### **Issue:** `Promise.all` in HistoryScreen will fail if ANY promise rejects

**File:** `src/screens/HistoryScreen.js`  
**Lines:** 92-95

**The Bug:**
```javascript
const [profileHistory, reports] = await Promise.all([fetchProfileHistory(), fetchReports()]);
```

**Problem:** If `fetchProfileHistory()` succeeds but `fetchReports()` fails, the **entire Promise.all rejects** and the error is caught by the outer try/catch, which sets `setError()`. This is actually handled correctly, but it would be better to use `Promise.allSettled` to handle each API call independently.

### **The Fix:**

**File:** `src/screens/HistoryScreen.js` (Lines 92-95)

**Current Code:**
```javascript
try {
    const [profileHistory, reports] = await Promise.all([fetchProfileHistory(), fetchReports()]);
    setCloudHistory(profileHistory?.history || []);
    setCloudReports(Array.isArray(reports) ? reports : []);
} catch {
    setCloudHistory([]);
    setCloudReports([]);
}
```

**Fixed Code:**
```javascript
try {
    const [profileHistoryResult, reportsResult] = await Promise.allSettled([
        fetchProfileHistory(),
        fetchReports(),
    ]);
    
    const profileHistory = profileHistoryResult.status === 'fulfilled' 
        ? profileHistoryResult.value 
        : null;
    const reports = reportsResult.status === 'fulfilled' 
        ? reportsResult.value 
        : [];
    
    setCloudHistory(profileHistory?.history || []);
    setCloudReports(Array.isArray(reports) ? reports : []);
} catch (error) {
    console.error('[HistoryScreen] Failed to fetch cloud data:', error);
    setCloudHistory([]);
    setCloudReports([]);
}
```

---

## 🚨 RED FLAG #6: SplashScreen Navigation Race Condition

### **Issue:** SplashScreen navigation callback may execute on unmounted component

**File:** `src/screens/SplashScreen.js`  
**Lines:** 105-115

**The Bug:**
```javascript
const timer = setTimeout(() => {
    hydrateAuthState()
        .then(({ accessToken }) => {
            if (!active) return;  // ✅ Has active check
            navigation.replace(accessToken ? 'Home' : 'Login');
        })
        .catch(() => {
            if (!active) return;  // ✅ Has active check
            navigation.replace('Login');
        });
}, 3000);

return () => {
    active = false;
    clearTimeout(timer);
};
```

**Analysis:** ✅ **GOOD** - The `active` flag properly prevents state updates on unmounted components.

**Status:** ✅ **ALL CLEAR** - No memory leak detected.

---

## 🚨 RED FLAG #7: ImageCaptureScreen Unhandled Database Errors

### **Issue:** `getUser()` and `saveScanResult()` may fail without user feedback

**File:** `src/screens/ImageCaptureScreen.js`  
**Lines:** 70-145

**The Bug:**
```javascript
const handleAnalyze = async () => {
    if (!imageUri) return;
    setAnalyzing(true);

    try {
        const currentUser = await getUser();  // ❌ No error handling
        const userId = currentUser?.server_id || currentUser?.email || currentUser?.id || 'current_user';
        const uploadResult = await uploadXrayImage(imageUri);
        // ...
        const scanId = await saveScanResult({...});  // ❌ No error handling
```

**Problem:** If `getUser()` fails (database corrupted, permission denied) or `saveScanResult()` fails, the error is caught by the outer try/catch, but the user sees a fallback result instead of a clear error message.

### **The Fix:**

**File:** `src/screens/ImageCaptureScreen.js` (Lines 70-145)

**Current Code:**
```javascript
const handleAnalyze = async () => {
    if (!imageUri) return;
    setAnalyzing(true);

    try {
        const currentUser = await getUser();
        const userId = currentUser?.server_id || currentUser?.email || currentUser?.id || 'current_user';
        const uploadResult = await uploadXrayImage(imageUri);
        // ...
    } catch (error) {
        const fallbackResult = {
            klGrade: null,
            riskScore: 0,
            diagnosisSummary: error?.message || 'Unable to analyze this image...',
            // ...
        };
        // ...
    } finally {
        setAnalyzing(false);
    }
};
```

**Fixed Code:**
```javascript
const handleAnalyze = async () => {
    if (!imageUri) return;
    setAnalyzing(true);

    try {
        let currentUser;
        try {
            currentUser = await getUser();
        } catch (dbError) {
            console.error('[ImageCaptureScreen] Failed to get user:', dbError);
            Alert.alert(
                'Database Error',
                'Unable to access local database. Please restart the app.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
            setAnalyzing(false);
            return;
        }

        const userId = currentUser?.server_id || currentUser?.email || currentUser?.id || 'current_user';
        
        let uploadResult;
        try {
            uploadResult = await uploadXrayImage(imageUri);
        } catch (uploadError) {
            console.error('[ImageCaptureScreen] Upload failed:', uploadError);
            Alert.alert(
                'Upload Failed',
                'Unable to upload image. Please check your connection.',
                [{ text: 'Try Again', onPress: () => handleAnalyze() }]
            );
            setAnalyzing(false);
            return;
        }
        
        // ... rest of the code ...
        
        let scanId;
        try {
            scanId = await saveScanResult({...});
        } catch (saveError) {
            console.error('[ImageCaptureScreen] Failed to save scan:', saveError);
            Alert.alert(
                'Save Failed',
                'Unable to save scan results locally.',
                [{ text: 'OK', onPress: () => navigation.navigate('Result', {...}) }]
            );
            // Still navigate to result but without scanId
            navigation.navigate('Result', {
                imageUri,
                kneeSide,
                scanId: null,
                // ...
            });
            setAnalyzing(false);
            return;
        }
```

---

## 📊 SUMMARY OF FINDINGS

| Category | Status | Issues Found |
|----------|--------|--------------|
| Native `fetch()` Error Handling | ✅ **FIXED** | 2 issues in `apiCore.js` - FIXED |
| AuthContext Race Conditions | 🔴 **CRITICAL** | 1 issue with deep link timing |
| Unhandled Promise Rejections | 🟡 **FIXED** | 3 issues in screens - FIXED |
| AsyncStorage Blocking | ✅ **CLEAR** | 0 issues |
| Memory Leaks | ✅ **CLEAR** | 0 issues |

---

## 🚀 ACTION REQUIRED BEFORE PRODUCTION BUILD

### **Priority 1 - CRITICAL (Must Fix):**
1. ✅ **DONE:** Fixed `api.js` `handleResponse` to attach status codes
2. ✅ **DONE:** Fixed `apiCore.js` `mapErrorResponse` to attach status codes to all error types
3. 🔴 **TODO:** Fix AuthContext race condition with deep links

### **Priority 2 - MODERATE (Should Fix):**
4. ✅ **DONE:** Added error UI to `QuestionnaireScreen` handleComplete
5. ✅ **DONE:** Added error handling to `ImageCaptureScreen` database operations
6. ✅ **DONE:** Changed `Promise.all` to `Promise.allSettled` in `HistoryScreen`

### **Priority 3 - LOW (Nice to Have):**
7. 🔴 **TODO:** Add error boundaries to catch all unhandled errors
8. 🔴 **TODO:** Add Sentry or similar error tracking

---

## ✅ FINAL STATUS

**STILL NOT READY FOR PRODUCTION.**

Fix the remaining Priority 1 issue (AuthContext race condition) before compiling EAS build.

All Priority 2 issues have been resolved.

