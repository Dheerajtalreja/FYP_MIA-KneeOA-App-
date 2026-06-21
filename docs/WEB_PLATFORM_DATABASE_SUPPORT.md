# Web Platform Database Support

## Date: 2026-06-19

---

## Problem

The app was crashing on web browsers with `expo-sqlite` WebAssembly errors:
- `sqlite3_open_v2`
- `cannot create file`

This occurred when trying to run `clearLocalUserData()` during the login flow because `expo-sqlite` requires native device modules (iOS/Android) that don't exist in web browsers.

---

## Solution

Added comprehensive web platform support to `src/services/database.js` using a localStorage-based mock storage system.

### Key Changes

#### 1. Added Platform Detection
```javascript
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';
```

#### 2. Created Web Storage Helper
```javascript
const webStorage = {
    data: {},
    
    setItem: (key, value) => {
        try {
            localStorage.setItem(`kneeoa_${key}`, JSON.stringify(value));
        } catch (error) {
            console.error('[Database] Web storage setItem failed:', error);
        }
    },
    
    getItem: (key) => {
        try {
            const stored = localStorage.getItem(`kneeoa_${key}`);
            return stored ? JSON.parse(stored) : null;
        } catch (error) {
            console.error('[Database] Web storage getItem failed:', error);
            return null;
        }
    },
    
    removeItem: (key) => {
        try {
            localStorage.removeItem(`kneeoa_${key}`);
        } catch (error) {
            console.error('[Database] Web storage removeItem failed:', error);
        }
    },
    
    clear: () => {
        try {
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('kneeoa_')) {
                    localStorage.removeItem(key);
                }
            });
        } catch (error) {
            console.error('[Database] Web storage clear failed:', error);
        }
    }
};
```

#### 3. Added Web Helper Functions
```javascript
const webClearUserData = async () => {
    if (isWeb) {
        webStorage.removeItem(WEB_KEY_USER);
        webStorage.removeItem(WEB_KEY_QUESTIONNAIRE);
        webStorage.removeItem(WEB_KEY_SCANS);
        webStorage.removeItem(WEB_KEY_RECOMMENDATIONS);
        webStorage.removeItem(WEB_KEY_SYNC_LOG);
        console.log('[Database] Web platform: Cleared localStorage user data');
        return true;
    }
    return false;
};

const webSaveCompleteProfile = (completeProfile) => {
    if (isWeb) {
        webStorage.setItem(WEB_KEY_USER, completeProfile.user);
        if (completeProfile.questionnaire) {
            webStorage.setItem(WEB_KEY_QUESTIONNAIRE, completeProfile.questionnaire);
        }
        if (completeProfile.scanHistory) {
            webStorage.setItem(WEB_KEY_SCANS, completeProfile.scanHistory);
        }
        if (completeProfile.recommendations) {
            webStorage.setItem(WEB_KEY_RECOMMENDATIONS, completeProfile.recommendations);
        }
        console.log('[Database] Web platform: Saved complete profile to localStorage');
        return true;
    }
    return false;
};
```

#### 4. Updated All Exported Functions
Each major function now checks for web platform and uses the appropriate storage:

```javascript
export const clearLocalUserData = async () => {
    if (isWeb) {
        return await webClearUserData();
    }
    
    // Original SQLite logic continues here...
    const database = await getDatabase();
    await database.runAsync('DELETE FROM users');
    // ... rest of SQLite operations
};

export const getUser = async () => {
    if (isWeb) {
        return webGetUser();
    }
    
    // Original SQLite logic continues here...
    const database = await getDatabase();
    return await database.getFirstAsync('SELECT * FROM users...');
};
```

---

## Functions Updated

| Function | Web Behavior | Native Behavior |
|----------|--------------|-----------------|
| `clearLocalUserData()` | Clears localStorage keys | Executes SQL DELETE statements |
| `saveUser()` | Saves to localStorage | INSERT/REPLACE in SQLite |
| `getUser()` | Retrieves from localStorage | SELECT from SQLite |
| `saveCompleteUserProfile()` | Saves all data to localStorage | Transaction with multiple INSERTs |
| `getLatestQuestionnaire()` | Retrieves from localStorage | SELECT with WHERE clause |
| `getScanHistory()` | Filters localStorage array | SELECT with WHERE clause |
| `getRecommendations()` | Filters localStorage array | SELECT with WHERE clause |

---

## Storage Keys

Web storage uses the following localStorage keys (prefixed with `kneeoa_`):

- `kneeoa_user` - User profile and authentication data
- `kneeoa_questionnaire` - Latest questionnaire responses
- `kneeoa_scans` - Array of scan history records
- `kneeoa_recommendations` - Array of recommendations
- `kneeoa_sync_log` - Sync operation log

---

## Testing Checklist

### Web Platform Testing
1. ✅ Run `expo start --web`
2. ✅ Log in with valid credentials
3. ✅ Verify no `sqlite3_open_v2` errors
4. ✅ Check browser DevTools → Application → Local Storage
5. ✅ Verify data is stored with `kneeoa_` prefix
6. ✅ Refresh browser page
7. ✅ Verify auto-login works (data persists)
8. ✅ Test logout (data cleared from localStorage)

### Native Platform Testing
1. ✅ Run on iOS simulator/device
2. ✅ Run on Android emulator/device
3. ✅ Verify SQLite database still works correctly
4. ✅ Verify data persists across app restarts
5. ✅ Ensure no regression in native functionality

---

## Browser DevTools Debugging

### Check LocalStorage
```javascript
// In browser console:
localStorage.getItem('kneeoa_user')
localStorage.getItem('kneeoa_questionnaire')
localStorage.getItem('kneeoa_scans')
localStorage.getItem('kneeoa_recommendations')
```

### Clear Web Storage
```javascript
// In browser console:
Object.keys(localStorage).forEach(key => {
    if (key.startsWith('kneeoa_')) {
        localStorage.removeItem(key);
    }
});
```

### View All KneeOA Data
```javascript
// In browser console:
const kneeoaData = {};
Object.keys(localStorage).forEach(key => {
    if (key.startsWith('kneeoa_')) {
        kneeoaData[key] = JSON.parse(localStorage.getItem(key));
    }
});
console.log(kneeoaData);
```

---

## Error Handling

All web storage operations include try/catch blocks with console logging:

```javascript
try {
    localStorage.setItem(`kneeoa_${key}`, JSON.stringify(value));
} catch (error) {
    console.error('[Database] Web storage setItem failed:', error);
}
```

Common web storage errors:
- **Quota Exceeded**: Browser localStorage quota (usually 5-10MB) exceeded
- **Security Error**: Third-party cookies blocked in privacy mode
- **Invalid State**: Storage API unavailable in certain browser contexts

---

## Performance Considerations

### localStorage Limitations
- **Size**: Typically 5-10MB per domain
- **Synchronous**: All operations block the main thread
- **No Queries**: Cannot run SQL-like queries on stored data
- **No Relationships**: Must manually manage data relationships

### When to Use Web Storage
✅ Small to medium data sets (< 5MB)  
✅ Simple key-value or JSON storage  
✅ Development and testing on web  
✅ Offline-first web applications  

### When NOT to Use Web Storage
❌ Large data sets (> 5MB)  
❌ Complex queries and relationships  
❌ High-frequency updates  
❌ Sensitive data (localStorage is not encrypted)  

---

## Future Enhancements

### Potential Improvements
1. **IndexedDB**: Migrate to IndexedDB for larger data sets
2. **Web Workers**: Move storage operations to background threads
3. **Encryption**: Add encryption for sensitive user data
4. **Sync Conflict Resolution**: Handle conflicts between web and native storage
5. **Migration Script**: Auto-migrate localStorage data to IndexedDB

### Recommended Libraries
- **idb**: Promise-based wrapper for IndexedDB
- **localForage**: Unified API for localStorage, IndexedDB, WebSQL
- ** Dexie.js**: Modern IndexedDB wrapper with SQLite-like syntax

---

## Key Learnings

1. **Always check Platform.OS** before using native-only APIs
2. **Provide fallback implementations** for cross-platform compatibility
3. **Use consistent naming** for storage keys across platforms
4. **Include error handling** for all storage operations
5. **Log clearly** which storage mechanism is being used

---

## Summary

✅ **expo-sqlite crashes fixed** - Web platform now uses localStorage  
✅ **No code duplication** - Single codebase for web and native  
✅ **Clear error messages** - Console logs show which storage is used  
✅ **Production ready** - Tested on web, iOS, and Android  
✅ **Zero regressions** - Native functionality unchanged  

---

*Web platform database support implemented. App now runs smoothly on web browsers!* 🌐
