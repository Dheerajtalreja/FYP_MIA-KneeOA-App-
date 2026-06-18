# Mobile App Integration Guide

## Overview

This guide explains how to integrate the Knee OA Backend with your mobile application. The backend provides endpoints to sync only the authenticated user's data to their device.

## Architecture

```
┌─────────────────┐
│   Mobile App    │
│   (SQLite)      │
└────────┬────────┘
         │
         │ HTTPS API Calls
         ▼
┌─────────────────┐
│  FastAPI Backend│
│  /api/v1/mobile │
└────────┬────────┘
         │
         │ SELECT WHERE user_id = ?
         ▼
┌─────────────────┐
│  Neon PostgreSQL│
│  (Cloud DB)     │
└─────────────────┘
```

## Sync Strategy

### What Gets Synced
- ✅ User profile (age, pain_level, mobility_level, has_support)
- ✅ User's uploaded X-ray images (metadata + S3 URLs)
- ✅ User's diagnostic reports (KL grades, recommendations)
- ✅ User's profile change history (audit trail)

### What Does NOT Get Synced
- ❌ Other users' data
- ❌ Exercise video library (downloaded separately if needed)
- ❌ System configurations
- ❌ Global settings

## API Endpoints

### 1. Get User Data (Full Sync) ⚠️ TODO

**Endpoint**: `GET /api/v1/mobile/sync/data`

**Authentication**: Required (Bearer token)

**Purpose**: Fetch authenticated user's complete profile, questionnaire responses, scan history, recommendations, and sync history from cloud

**Status**: ❌ **NOT IMPLEMENTED** - Needs backend implementation

**Expected Response**:
```json
{
  "user": {
    "server_id": 1,
    "email": "patient@example.com",
    "full_name": "John Doe",
    "role": "patient",
    "created_at": "2026-01-15T10:30:00",
    "last_login": "2026-03-30T08:00:00"
  },
  "questionnaire": {
    "age": 45,
    "gender": "M",
    "weight": 85.5,
    "height": 175,
    "pain_level": 6,
    "pain_location": "left_knee",
    "mobility_score": 7,
    "family_history": true,
    "completed_at": "2026-03-30T09:00:00"
  },
  "scan_history": [
    {
      "id": 1,
      "image_uri": "s3://bucket/scan_20260330.png",
      "knee_side": "left",
      "view_type": "PA",
      "kl_grade": 2,
      "risk_score": 0.67,
      "scanned_at": "2026-03-30T09:15:00"
    }
  ],
  "recommendations": [
    {
      "id": 1,
      "scan_id": 1,
      "recommendation_text": "Grade 2 — Minimal OA",
      "exercises": ["walking", "swimming"],
      "lifestyle_tips": ["maintain healthy weight"],
      "generated_at": "2026-03-30T09:30:00"
    }
  ],
  "synced_at": "2026-03-30T10:00:00"
}
```

---

### 2. Get Sync Summary ⚠️ TODO

**Endpoint**: `GET /api/v1/mobile/sync/summary`

**Purpose**: Check counts of synced data for progress indicators

**Status**: ❌ **NOT IMPLEMENTED** - Needs backend implementation

**Expected Response**:
```json
{
  "user_id": 1,
  "questionnaire_count": 1,
  "scan_count": 5,
  "recommendation_count": 5,
  "total_records": 11,
  "last_sync": "2026-03-30T10:00:00"
}
```

---

### 3. Push Sync Data to Cloud ✅ IMPLEMENTED

**Endpoint**: `POST /api/v1/mobile/sync/export`

**Authentication**: Required (Bearer token)

**Purpose**: Upload pending local changes (questionnaire, scans, recommendations) to cloud

**Status**: ✅ **IMPLEMENTED** in mobile app

**Request Payload**:
```json
{
  "table": "questionnaire_responses|scan_history|recommendations",
  "action": "insert|update|delete",
  "record": {
    "id": 1,
    "user_id": "user_123",
    "...": "field data"
  }
}
```

---

### 4. Get Sync Status ⚠️ TODO

**Endpoint**: `GET /api/v1/mobile/sync/status`

**Purpose**: Check overall sync health and data availability

**Status**: ❌ **NOT IMPLEMENTED** - Needs backend implementation

**Expected Response**:
```json
{
  "user_id": 1,
  "synced": true,
  "last_sync": "2026-03-30T10:00:00",
  "pending_records": 0,
  "failed_syncs": 0
}
```

---

## Mobile Database Schema

The mobile app uses **expo-sqlite** for local offline-first storage. The backend syncs data into these tables:

### Tables

#### `users` - User Profile
```sql
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    server_id TEXT UNIQUE,
    email TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'patient',
    token TEXT,
    profile_data TEXT,           -- JSON string
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    synced INTEGER DEFAULT 0
);
```

#### `questionnaire_responses` - Health Assessment
```sql
CREATE TABLE IF NOT EXISTS questionnaire_responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    age INTEGER,
    gender TEXT,
    weight REAL,
    height REAL,
    pain_level INTEGER DEFAULT 0,
    pain_location TEXT,
    pain_duration TEXT,
    mobility_score INTEGER DEFAULT 0,
    can_bend_fully INTEGER DEFAULT 1,
    can_climb_stairs INTEGER DEFAULT 1,
    can_walk_30min INTEGER DEFAULT 1,
    previous_injuries TEXT,
    surgeries TEXT,
    medications TEXT,
    family_history INTEGER DEFAULT 0,
    additional_notes TEXT,
    completed_at TEXT DEFAULT (datetime('now')),
    synced INTEGER DEFAULT 0
);
```

#### `scan_history` - X-ray Scans
```sql
CREATE TABLE IF NOT EXISTS scan_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    image_uri TEXT,
    image_type TEXT DEFAULT 'xray',
    view_type TEXT DEFAULT 'PA',
    knee_side TEXT,
    kl_grade INTEGER,
    risk_score REAL,
    analysis_result TEXT,        -- JSON string
    annotations TEXT,            -- JSON string
    scanned_at TEXT DEFAULT (datetime('now')),
    synced INTEGER DEFAULT 0
);
```

#### `recommendations` - Treatment Recommendations
```sql
CREATE TABLE IF NOT EXISTS recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    scan_id INTEGER,
    recommendation_text TEXT,
    exercises TEXT,              -- JSON array
    lifestyle_tips TEXT,         -- JSON array
    generated_at TEXT DEFAULT (datetime('now')),
    synced INTEGER DEFAULT 0,
    FOREIGN KEY (scan_id) REFERENCES scan_history(id)
);
```

#### `video_references` - Exercise Library
```sql
CREATE TABLE IF NOT EXISTS video_references (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    description TEXT,
    video_url TEXT,
    thumbnail_url TEXT,
    category TEXT,
    difficulty TEXT,
    duration_seconds INTEGER,
    target_kl_grades TEXT,       -- JSON array
    cached_locally INTEGER DEFAULT 0
);
```

#### `sync_log` - Sync Audit Trail
```sql
CREATE TABLE IF NOT EXISTS sync_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    table_name TEXT,
    record_id INTEGER,
    action TEXT,                 -- 'insert', 'update', 'delete'
    status TEXT DEFAULT 'pending', -- 'pending', 'synced', 'failed'
    attempted_at TEXT,
    completed_at TEXT,
    error_message TEXT
);
```

---

## Mobile App Implementation Status

### ✅ Already Implemented

- **SQLite Database** - Using expo-sqlite for offline storage
- **Push Sync** - `syncDataToCloud()` uploads pending changes to `/api/v1/mobile/sync/export`
- **Sync Logging** - Tracks all sync operations with status (pending/synced/failed)
- **Periodic Sync** - `startPeriodicSync()` runs every 5 minutes
- **Offline Detection** - `isOnline()` checks connectivity before syncing
- **Error Handling** - Retry logic with exponential backoff

### ❌ Needs Implementation

- **Pull Sync** - `fetchLatestFromCloud()` exists but is never called; needs wiring
- **Token Refresh** - No refresh token logic (docs mention 15-min expiration)
- **Incremental Sync** - Always full sync, should compare timestamps
- **Conflict Resolution** - No server-authority implementation
- **UI Integration** - No sync status indicators in screens

---

## JavaScript Implementation

### 1. Setup Sync Service (Already Implemented)

The sync service is in [src/services/sync.js](src/services/sync.js):

```javascript
import { startPeriodicSync, performSync } from './services/sync';

// In App.js or after login
export const initializeSync = () => {
    startPeriodicSync(5 * 60 * 1000); // 5 minutes
};
```

### 2. Database Service (Already Implemented)

The database is initialized in [src/services/database.js](src/services/database.js):

```javascript
import { getDatabase, saveQuestionnaireResponse, saveScanResult } from './services/database';

// Initialize DB on app start
export const initDB = async () => {
    const db = await getDatabase();
    console.log('Database initialized');
};

// Save questionnaire
const questionnaireId = await saveQuestionnaireResponse({
    userId: user.id,
    age: 45,
    gender: 'M',
    weight: 85.5,
    pain_level: 6,
    // ... other fields
});

// Save scan result
const scanId = await saveScanResult({
    userId: user.id,
    image_uri: 's3://bucket/scan.png',
    knee_side: 'left',
    view_type: 'PA',
    kl_grade: 2,
    risk_score: 0.67,
    // ... other fields
});
```

### 3. API Service (Partially Implemented)

The API service is in [src/services/api.js](src/services/api.js):

```javascript
import { 
    syncDataToCloud,          // ✅ Implemented
    fetchLatestFromCloud,     // ⚠️ Exists but unused
    loginUser,                // ✅ Implemented
    uploadXrayImage,          // ✅ Implemented
    isOnline                  // ✅ Implemented
} from './services/api';

// ✅ WORKS - Push local changes to cloud
await syncDataToCloud({
    table: 'questionnaire_responses',
    action: 'insert',
    record: questionnaireData
});

// ⚠️ TODO - Pull cloud data to local (never called)
const cloudData = await fetchLatestFromCloud(lastSyncTimestamp);
```

### 4. Add Pull Sync to LoginScreen (TODO)

After successful login, add:

```javascript
import { fetchLatestFromCloud } from '../services/api';
import { saveUser } from '../services/database';

export const LoginScreen = () => {
    const handleLoginSuccess = async (response) => {
        // Save user
        await saveUser({
            id: response.user_id,
            email: response.email,
            fullName: response.full_name,
            token: response.access_token
        });

        // ✅ Pull latest cloud data on first login
        const cloudData = await fetchLatestFromCloud(null);
        // TODO: Insert cloudData into local tables
        
        navigation.navigate('Home');
    };
};
```

### 5. ⚠️ CRITICAL: Missing Pull Sync Implementation

**File**: [src/services/database.js](src/services/database.js) - Add these functions

```javascript
// ❌ MISSING - Add these to handle pull sync data

export const savePulledUserProfile = async (user) => {
    const database = await getDatabase();
    await database.runAsync(
        `INSERT OR REPLACE INTO users
         (server_id, email, full_name, role, updated_at)
         VALUES (?, ?, ?, ?, datetime('now'))`,
        [user.server_id, user.email, user.full_name, user.role]
    );
};

export const savePulledQuestionnaire = async (questionnaire) => {
    const database = await getDatabase();
    // Clear old questionnaires and insert latest
    await database.runAsync('DELETE FROM questionnaire_responses');
    
    await database.runAsync(
        `INSERT INTO questionnaire_responses
         (user_id, age, gender, weight, height, pain_level, 
          pain_location, mobility_score, family_history, completed_at, synced)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
        [
            questionnaire.user_id || 'unknown',
            questionnaire.age,
            questionnaire.gender,
            questionnaire.weight,
            questionnaire.height,
            questionnaire.pain_level,
            questionnaire.pain_location,
            questionnaire.mobility_score,
            questionnaire.family_history ? 1 : 0,
            questionnaire.completed_at
        ]
    );
};

export const savePulledScans = async (scans) => {
    const database = await getDatabase();
    // Clear old scans and insert new ones
    await database.runAsync('DELETE FROM scan_history');
    
    for (const scan of scans) {
        await database.runAsync(
            `INSERT INTO scan_history
             (user_id, image_uri, image_type, view_type, knee_side,
              kl_grade, risk_score, scanned_at, synced)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
            [
                scan.user_id || 'unknown',
                scan.image_uri,
                scan.image_type || 'xray',
                scan.view_type || 'PA',
                scan.knee_side,
                scan.kl_grade,
                scan.risk_score,
                scan.scanned_at
            ]
        );
    }
};

export const savePulledRecommendations = async (recommendations) => {
    const database = await getDatabase();
    // Clear old recommendations and insert new ones
    await database.runAsync('DELETE FROM recommendations');
    
    for (const rec of recommendations) {
        await database.runAsync(
            `INSERT INTO recommendations
             (user_id, scan_id, recommendation_text, exercises, lifestyle_tips, generated_at, synced)
             VALUES (?, ?, ?, ?, ?, ?, 1)`,
            [
                rec.user_id || 'unknown',
                rec.scan_id,
                rec.recommendation_text,
                JSON.stringify(rec.exercises || []),
                JSON.stringify(rec.lifestyle_tips || []),
                rec.generated_at
            ]
        );
    }
};
```

### 6. ⚠️ CRITICAL: Wire Pull Sync After Login

**File**: [src/screens/LoginScreen.js](src/screens/LoginScreen.js) - Add pull sync after login

```javascript
import { fetchLatestFromCloud } from '../services/api';
import { 
    savePulledUserProfile,
    savePulledQuestionnaire,
    savePulledScans,
    savePulledRecommendations
} from '../services/database';

const LoginScreen = () => {
    const handleLoginSuccess = async (loginResponse) => {
        try {
            // 1. Save user and auth token
            setAuthToken(loginResponse.access_token);
            await saveUser({
                id: loginResponse.user_id,
                email: loginResponse.email,
                fullName: loginResponse.full_name,
                token: loginResponse.access_token
            });

            // 2. ✅ NEW: Pull cloud data on first login
            console.log('[Login] Pulling cloud data...');
            const syncData = await fetchLatestFromCloud(null);
            
            if (syncData) {
                // Insert all cloud data into local database
                if (syncData.user) {
                    await savePulledUserProfile(syncData.user);
                }
                if (syncData.questionnaire) {
                    await savePulledQuestionnaire(syncData.questionnaire);
                }
                if (syncData.scan_history && syncData.scan_history.length > 0) {
                    await savePulledScans(syncData.scan_history);
                }
                if (syncData.recommendations && syncData.recommendations.length > 0) {
                    await savePulledRecommendations(syncData.recommendations);
                }
                console.log('[Login] Cloud data synced to local database');
            }

            // 3. Start periodic sync
            startPeriodicSync(5 * 60 * 1000);

            // Navigate to home
            navigation.navigate('Home');
        } catch (error) {
            console.error('[Login] Sync failed:', error);
            Alert.alert('Sync Error', 'Could not sync data. Please check your connection.');
        }
    };
};
```

### 7. ⚠️ CRITICAL: Add Token Refresh Logic

**File**: [src/services/api.js](src/services/api.js) - Add refresh token handler

```javascript
let authToken = null;
let refreshToken = null;

export const setAuthToken = (token) => {
    authToken = token;
};

export const setRefreshToken = (token) => {
    refreshToken = token;
};

// Add this function to handle 401 and refresh token
const handleResponse = async (response) => {
    // If 401 (token expired), try to refresh
    if (response.status === 401 && refreshToken) {
        console.log('[API] Token expired, attempting refresh...');
        try {
            const refreshResponse = await fetch(buildUrl('/api/v1/auth/refresh'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh_token: refreshToken })
            });

            if (refreshResponse.ok) {
                const refreshData = await refreshResponse.json();
                setAuthToken(refreshData.access_token);
                // Optionally save new token to secure storage
                console.log('[API] Token refreshed successfully');
                return refreshData;
            }
        } catch (error) {
            console.warn('[API] Token refresh failed:', error);
            // Force re-login
            throw new Error('Session expired. Please login again.');
        }
    }

    if (!response.ok) {
        const error = await parseResponseBody(response).catch(() => ({}));
        const message = typeof error === 'string' ? error : error.detail || error.message;
        throw new Error(message || `HTTP ${response.status}: Request failed`);
    }
    return parseResponseBody(response);
};

// Update login to save refresh token
export const loginUser = async (email, password) => {
    try {
        const body = new URLSearchParams();
        body.append('username', email);
        body.append('password', password);

        const response = await fetch(buildUrl('/api/v1/auth/login'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
        });
        const data = await handleResponse(response);
        
        // ✅ NEW: Save refresh token
        if (data.refresh_token) {
            setRefreshToken(data.refresh_token);
            // TODO: Save to AsyncStorage or secure storage
        }
        
        return data;
    } catch (error) {
        console.warn('[API] Login failed:', error.message);
        throw error;
    }
};
```

---

## Backend API Implementation (FastAPI)

### ⚠️ CRITICAL - These endpoints are missing from backend

1. `GET /api/v1/mobile/sync/data` - Return user's synced data
2. `GET /api/v1/mobile/sync/summary` - Return data counts
3. `GET /api/v1/mobile/sync/status` - Return sync health

See [BACKEND_CONFIGURATION.md](BACKEND_CONFIGURATION.md) for implementation guide.

---

## Sync Strategy Implementation

### Current Implementation ✅

1. **Push Sync** (Working)
   - Triggered every 5 minutes via `startPeriodicSync()`
   - Sends all `sync_log` pending items to `/api/v1/mobile/sync/export`
   - Marks as `synced` or `failed` based on response

2. **Offline Mode** (Working)
   - Checks `isOnline()` before syncing
   - Gracefully defers sync when offline
   - Logs still created locally

3. **Error Tracking** (Working)
   - Failed syncs recorded in `sync_log` with error message
   - Status tracked: `pending` → `synced` or `failed`

### Needs Implementation ⚠️

1. **Pull Sync** (TODO)
   - Call `fetchLatestFromCloud()` after login
   - Parse response and insert into local tables
   - Compare `synced_at` timestamp for incremental sync

2. **Token Refresh** (TODO)
   - Backend tokens expire after 15 minutes
   - Need refresh token endpoint
   - Auto-refresh before expiry or on 401 error

3. **Conflict Resolution** (TODO)
   - Server data is authoritative
   - Mobile app accepts server version on conflict
   - Keep audit trail of all changes

---

## Error Handling

### Implemented ✅

| Error | Handling | Result |
|-------|----------|--------|
| Network Offline | Skip sync, queue locally | Deferred until online |
| Network timeout | Catch, log, retry next cycle | No data loss |
| Invalid JSON | Parse error handling | Logged to console |

### Needs Implementation ⚠️

| Status | Error | Solution |
|--------|-------|----------|
| 401 | Unauthorized (token expired) | TODO: Refresh token |
| 404 | Endpoint not found | Backend not implemented |
| 409 | Conflict (concurrent edit) | TODO: Resolve server-authority |
| 500 | Server error | Retry with exponential backoff |

### Current Retry Logic ✅

```javascript
// In sync.js - runs every 5 minutes
export const performSync = async () => {
    if (!await isOnline()) {
        console.log('[Sync] Offline, deferring');
        return { synced: 0, failed: 0, offline: true };
    }
    
    // Process each pending item
    for (const item of pendingItems) {
        try {
            await syncDataToCloud(record);
            await markSynced(item.id);
        } catch (error) {
            await markSyncFailed(item.id, error.message);
            // Will retry next cycle
        }
    }
};
```

---

## Testing Sync Endpoints

### 1. Test Push Sync (Currently Working)

```bash
# Get token first
TOKEN=$(curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=patient@test.com&password=SecurePass123!@#" \
  | jq -r '.access_token')

# Push sync data
curl -X POST http://localhost:8000/api/v1/mobile/sync/export \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "table": "questionnaire_responses",
    "action": "insert",
    "record": {
      "user_id": "1",
      "age": 45,
      "pain_level": 6
    }
  }' | jq .
```

### 2. Test Pull Sync (TODO - Backend Not Implemented)

```bash
# This endpoint needs to be implemented on backend
curl -X GET http://localhost:8000/api/v1/mobile/sync/data \
  -H "Authorization: Bearer $TOKEN" \
  | jq .
```

### 3. Monitor Sync Log

```bash
# In SQLite
sqlite3 kneeoa_local.db
SELECT * FROM sync_log;
```

---

## Next Steps

### Immediate (Critical Path)

1. **Implement Backend Endpoints**
   - [ ] `GET /api/v1/mobile/sync/data` - Return user's questionnaire, scans, recommendations
   - [ ] `GET /api/v1/mobile/sync/summary` - Return record counts
   - [ ] `GET /api/v1/mobile/sync/status` - Return sync health
   - See [BACKEND_CONFIGURATION.md](BACKEND_CONFIGURATION.md)

2. **Wire Pull Sync in Mobile App**
   - [ ] Call `fetchLatestFromCloud()` after login
   - [ ] Parse response and insert into local tables
   - [ ] Show sync progress indicator

3. **Implement Token Refresh**
   - [ ] Backend: Add `/api/v1/auth/refresh` endpoint
   - [ ] Mobile: Auto-refresh token on 401 or expiry

### Medium Priority

4. [ ] Incremental sync using `synced_at` timestamp
5. [ ] Conflict resolution (server-authority pattern)
6. [ ] Encryption of local SQLite database
7. [ ] User-facing sync status screen

### Low Priority

8. [ ] Batch sync optimization
9. [ ] Sync analytics/metrics
10. [ ] Advanced conflict resolution UI

---

**Last Updated**: April 21, 2026 (Updated from specification to match actual implementation)  
**Version**: 2.0  
**Status**: ⚠️ **PARTIAL** - Mobile push sync working, pull sync TODO, backend endpoints TODO
