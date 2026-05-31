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

---

## Mobile Sync Implementation Status

### ✅ Backend Status (April 21, 2026)
All 4 sync endpoints are **fully implemented** in `app/api/v1/mobile_sync.py`

| Endpoint | Status |
|----------|--------|
| `GET /api/v1/mobile/sync/data` | ✅ IMPLEMENTED |
| `GET /api/v1/mobile/sync/summary` | ✅ IMPLEMENTED |
| `GET /api/v1/mobile/sync/status` | ✅ IMPLEMENTED |
| `POST /api/v1/mobile/sync/export` | ✅ IMPLEMENTED |

### ✅ Mobile App Status
- SQLite database schema: ✅ Ready
- Push sync (5-min periodic): ✅ Working
- Offline detection: ✅ Working
- Pull sync integration: ⚠️ Needs LoginScreen wiring
- Token refresh: ⚠️ TODO

---

## API Endpoints

### 1. Get User Data (Pull Sync) ✅ IMPLEMENTED

**Endpoint**: `GET /api/v1/mobile/sync/data`

**Authentication**: Required (Bearer token)

**Purpose**: Download authenticated user's profile, images, reports, and history

**Response** (from backend):
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
  "images": [
    {
      "image_id": 1,
      "s3_url": "https://s3.amazonaws.com/bucket/xray1.png",
      "processed_s3_url": "https://s3.amazonaws.com/bucket/processed1.png",
      "file_name": "knee_xray_20260330.png",
      "content_type": "image/png",
      "uploaded_at": "2026-03-30T09:00:00"
    }
  ],
  "reports": [
    {
      "report_id": 1,
      "image_id": 1,
      "kl_grade": 2,
      "confidence": 0.87,
      "diagnosis_summary": "Grade 2 — Minimal OA",
      "recommendation": "Stay active with low-impact exercises",
      "lifestyle_plan": [],
      "warnings": [],
      "exercise_video_urls": [],
      "created_at": "2026-03-30T09:30:00"
    }
  ],
  "history": [
    {
      "log_id": 1,
      "field_name": "pain_level",
      "old_value": "3",
      "new_value": "6",
      "changed_at": "2026-03-30T08:30:00"
    }
  ],
  "synced_at": "2026-03-30T10:00:00"
}
```

---

### 2. Get Sync Summary ✅ IMPLEMENTED

**Endpoint**: `GET /api/v1/mobile/sync/summary`

**Purpose**: Check how much data will be synced (for progress indicators)

**Response**:
```json
{
  "user_id": 1,
  "images_count": 5,
  "reports_count": 3,
  "history_count": 12,
  "total_records": 20
}
```

---

### 3. Push Sync Data to Cloud ✅ IMPLEMENTED

**Endpoint**: `POST /api/v1/mobile/sync/export`

**Purpose**: Upload pending local changes (questionnaire, scans, recommendations) to cloud

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

### 4. Get Sync Status ✅ IMPLEMENTED

**Endpoint**: `GET /api/v1/mobile/sync/status`

**Purpose**: Check overall sync health and data availability

**Response**:
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

The mobile app uses **expo-sqlite** for local offline-first storage with these tables:

### tables

#### `users`
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

#### `questionnaire_responses`
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

#### `scan_history`
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

#### `recommendations`
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

#### `video_references`
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

#### `sync_log`
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

## Implementation Examples

### JavaScript/React Native

#### 1. Push Sync (Mobile → Cloud)

```javascript
import { syncDataToCloud } from './services/api';
import { saveQuestionnaireResponse } from './services/database';

// Save locally and log for sync
const questionnaireId = await saveQuestionnaireResponse({
    userId: user.id,
    age: 45,
    pain_level: 6,
    // ... other fields
});

// Periodic sync will pick this up
// Every 5 minutes: syncDataToCloud() is called
```

#### 2. Pull Sync (Cloud → Mobile)

```javascript
import { fetchLatestFromCloud } from './services/api';
import { 
    savePulledUserProfile,
    savePulledQuestionnaire,
    savePulledScans,
    savePulledRecommendations
} from './services/database';

// After login
const cloudData = await fetchLatestFromCloud(null);

// Save pulled data to local SQLite
if (cloudData.user) {
    await savePulledUserProfile(cloudData.user);
}
if (cloudData.questionnaire) {
    await savePulledQuestionnaire(cloudData.questionnaire);
}
if (cloudData.images && cloudData.images.length > 0) {
    await savePulledScans(cloudData.images);
}
if (cloudData.reports && cloudData.reports.length > 0) {
    await savePulledRecommendations(cloudData.reports);
}
```

#### 3. Offline Support

```javascript
import { isOnline, performSync } from './services/api';
import { startPeriodicSync } from './services/sync';

// On app start
await startPeriodicSync(5 * 60 * 1000); // 5 minutes

// Sync logic handles offline automatically
// - If offline: queues locally, skips sync
// - If online: sends all pending items
// - No data loss on offline transitions
```

---

## Sync Flow Diagram

```
┌─────────────────────────────────────┐
│ User Login                          │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ POST /api/v1/auth/login             │
│ Get access_token                    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ GET /api/v1/mobile/sync/data        │
│ Pull user's profile, images, reports│
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ Save to local SQLite                │
│ savePulledUserProfile()             │
│ savePulledQuestionnaire()           │
│ savePulledScans()                   │
│ savePulledRecommendations()         │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│ startPeriodicSync(5 min)            │
└──────────────┬──────────────────────┘
               │
       ┌───────┴────────┐
       │                │
       ▼                ▼
   ONLINE              OFFLINE
   (every 5 min)       (skip)
       │                │
       │                └──────────┐
       │                           │
       ▼                           │
POST /api/v1/mobile/sync/export   │
(upload pending items)             │
       │                           │
       └───────────────────────────┘
               │
               ▼
           sync_log updated
         (status: synced/failed)
```

---

## Testing Sync

### Manual Test 1: Full Sync Flow

```bash
# 1. Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -d "username=test@example.com&password=TestPass123!@#"

# 2. Get token from response, then pull sync data
TOKEN="<access_token>"
curl -X GET http://localhost:8000/api/v1/mobile/sync/data \
  -H "Authorization: Bearer $TOKEN"

# 3. Check sync summary
curl -X GET http://localhost:8000/api/v1/mobile/sync/summary \
  -H "Authorization: Bearer $TOKEN"

# 4. Push sync data
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
  }'
```

### Manual Test 2: Offline Behavior

```
1. Fill questionnaire offline
2. Check sync_log → should show "pending" status
3. Go online
4. Check sync_log → should show "synced" status
5. Verify on backend: questionnaire is stored
```

---

## Error Codes & Recovery

| Status | Error | Recovery |
|--------|-------|----------|
| 401 | Unauthorized | Token expired, need re-login |
| 404 | Endpoint not found | Verify backend version |
| 500 | Server error | Retry sync next cycle |
| Network timeout | Connection lost | Defer until online |

---

## Next Steps for Mobile Team

1. **Wire Pull Sync After Login** - See [FRONTEND_CONTEXT.md](FRONTEND_CONTEXT.md)
2. **Add Sync Status UI** - Display "Syncing X of Y records..."
3. **Implement Token Refresh** - Handle 401 errors gracefully
4. **Test Offline Scenarios** - Toggle airplane mode, verify queue

---

**Version**: 2.0  
**Last Updated**: April 21, 2026  
**Status**: ✅ Backend endpoints fully implemented, mobile integration ready
