// ─── SQLite Local Database Service ─────────────────────────────
// Offline-first storage using expo-sqlite for caching user data,
// questionnaire responses, scan results, recommendations, and
// video references. All writes are logged for cloud sync.

import * as SQLite from 'expo-sqlite';

const DB_NAME = 'kneeoa_local.db';
let db = null;

// ── Initialisation ─────────────────────────────────────────────

export const getDatabase = async () => {
    if (db) return db;
    db = await SQLite.openDatabaseAsync(DB_NAME);
    await initializeTables(db);
    return db;
};

const initializeTables = async (database) => {
    await database.execAsync(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            server_id TEXT UNIQUE,
            email TEXT NOT NULL,
            full_name TEXT,
            role TEXT DEFAULT 'patient',
            token TEXT,
            profile_data TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            synced INTEGER DEFAULT 0
        );

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

        CREATE TABLE IF NOT EXISTS scan_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            image_uri TEXT,
            image_type TEXT DEFAULT 'xray',
            view_type TEXT DEFAULT 'PA',
            knee_side TEXT,
            kl_grade INTEGER,
            risk_score REAL,
            analysis_result TEXT,
            annotations TEXT,
            scanned_at TEXT DEFAULT (datetime('now')),
            synced INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS recommendations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            scan_id INTEGER,
            recommendation_text TEXT,
            exercises TEXT,
            lifestyle_tips TEXT,
            generated_at TEXT DEFAULT (datetime('now')),
            synced INTEGER DEFAULT 0,
            FOREIGN KEY (scan_id) REFERENCES scan_history(id)
        );

        CREATE TABLE IF NOT EXISTS video_references (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT,
            description TEXT,
            video_url TEXT,
            thumbnail_url TEXT,
            category TEXT,
            difficulty TEXT,
            duration_seconds INTEGER,
            target_kl_grades TEXT,
            cached_locally INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS sync_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            table_name TEXT,
            record_id INTEGER,
            action TEXT,
            status TEXT DEFAULT 'pending',
            attempted_at TEXT,
            completed_at TEXT,
            error_message TEXT
        );
    `);
};

// ── User Operations ────────────────────────────────────────────

export const saveUser = async (userData) => {
    const database = await getDatabase();
    const result = await database.runAsync(
        `INSERT OR REPLACE INTO users
         (server_id, email, full_name, role, token, profile_data, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
            userData.id || null,
            userData.email,
            userData.fullName,
            userData.role || 'patient',
            userData.token || null,
            JSON.stringify(userData.profile || {}),
        ]
    );
    return result.lastInsertRowId;
};

export const getUser = async () => {
    const database = await getDatabase();
    return await database.getFirstAsync(
        'SELECT * FROM users ORDER BY updated_at DESC LIMIT 1'
    );
};

export const deleteUser = async () => {
    const database = await getDatabase();
    await database.runAsync('DELETE FROM users');
};

// ── Questionnaire Operations ───────────────────────────────────

export const saveQuestionnaireResponse = async (response) => {
    const database = await getDatabase();
    const result = await database.runAsync(
        `INSERT INTO questionnaire_responses
         (user_id, age, gender, weight, height,
          pain_level, pain_location, pain_duration,
          mobility_score, can_bend_fully, can_climb_stairs, can_walk_30min,
          previous_injuries, surgeries, medications, family_history, additional_notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            response.userId,
            response.age,
            response.gender,
            response.weight,
            response.height,
            response.painLevel,
            response.painLocation,
            response.painDuration,
            response.mobilityScore,
            response.canBendFully ? 1 : 0,
            response.canClimbStairs ? 1 : 0,
            response.canWalk30Min ? 1 : 0,
            response.previousInjuries,
            response.surgeries,
            response.medications,
            response.familyHistory ? 1 : 0,
            response.additionalNotes,
        ]
    );
    await logSyncAction('questionnaire_responses', result.lastInsertRowId, 'insert');
    return result.lastInsertRowId;
};

export const getLatestQuestionnaire = async (userId) => {
    const database = await getDatabase();
    return await database.getFirstAsync(
        'SELECT * FROM questionnaire_responses WHERE user_id = ? ORDER BY completed_at DESC LIMIT 1',
        [userId]
    );
};

export const getAllQuestionnaires = async (userId) => {
    const database = await getDatabase();
    return await database.getAllAsync(
        'SELECT * FROM questionnaire_responses WHERE user_id = ? ORDER BY completed_at DESC',
        [userId]
    );
};

// ── Scan Operations ────────────────────────────────────────────

export const saveScanResult = async (scanData) => {
    const database = await getDatabase();
    const result = await database.runAsync(
        `INSERT INTO scan_history
         (user_id, image_uri, image_type, view_type, knee_side,
          kl_grade, risk_score, analysis_result, annotations)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            scanData.userId,
            scanData.imageUri,
            scanData.imageType || 'xray',
            scanData.viewType || 'PA',
            scanData.kneeSide || 'left',
            scanData.klGrade,
            scanData.riskScore,
            JSON.stringify(scanData.analysisResult || {}),
            JSON.stringify(scanData.annotations || {}),
        ]
    );
    await logSyncAction('scan_history', result.lastInsertRowId, 'insert');
    return result.lastInsertRowId;
};

export const getScanHistory = async (userId) => {
    const database = await getDatabase();
    return await database.getAllAsync(
        'SELECT * FROM scan_history WHERE user_id = ? ORDER BY scanned_at DESC',
        [userId]
    );
};

export const getScanById = async (scanId) => {
    const database = await getDatabase();
    return await database.getFirstAsync(
        'SELECT * FROM scan_history WHERE id = ?',
        [scanId]
    );
};

// ── Recommendations Operations ─────────────────────────────────

export const saveRecommendation = async (recData) => {
    const database = await getDatabase();
    const result = await database.runAsync(
        `INSERT INTO recommendations
         (user_id, scan_id, recommendation_text, exercises, lifestyle_tips)
         VALUES (?, ?, ?, ?, ?)`,
        [
            recData.userId,
            recData.scanId,
            recData.text,
            JSON.stringify(recData.exercises || []),
            JSON.stringify(recData.lifestyleTips || []),
        ]
    );
    return result.lastInsertRowId;
};

export const getRecommendations = async (userId) => {
    const database = await getDatabase();
    return await database.getAllAsync(
        'SELECT * FROM recommendations WHERE user_id = ? ORDER BY generated_at DESC',
        [userId]
    );
};

export const getRecommendationForScan = async (scanId) => {
    const database = await getDatabase();
    return await database.getFirstAsync(
        'SELECT * FROM recommendations WHERE scan_id = ?',
        [scanId]
    );
};

// ── Video Library Operations ───────────────────────────────────

export const getVideoLibrary = async (category = null) => {
    const database = await getDatabase();
    if (category) {
        return await database.getAllAsync(
            'SELECT * FROM video_references WHERE category = ? ORDER BY title',
            [category]
        );
    }
    return await database.getAllAsync(
        'SELECT * FROM video_references ORDER BY category, title'
    );
};

export const seedVideoLibrary = async () => {
    const database = await getDatabase();
    const count = await database.getFirstAsync(
        'SELECT COUNT(*) as count FROM video_references'
    );
    if (count.count > 0) return;

    const videos = [
        {
            title: 'Straight Leg Raises',
            description:
                'Strengthen your quadriceps without bending the knee. Ideal for early-stage OA management.',
            category: 'strengthening',
            difficulty: 'easy',
            duration: 300,
            kl: '0,1,2',
        },
        {
            title: 'Hamstring Stretches',
            description:
                'Gentle hamstring stretching to improve flexibility and reduce knee tension.',
            category: 'stretching',
            difficulty: 'easy',
            duration: 240,
            kl: '0,1,2,3',
        },
        {
            title: 'Wall Squats',
            description:
                'Controlled squats using wall support to build quadricep strength safely.',
            category: 'strengthening',
            difficulty: 'medium',
            duration: 360,
            kl: '0,1,2',
        },
        {
            title: 'Seated Knee Extension',
            description:
                'Gentle knee extension exercise performed while seated. Safe for most OA stages.',
            category: 'strengthening',
            difficulty: 'easy',
            duration: 300,
            kl: '0,1,2,3',
        },
        {
            title: 'Calf Raises',
            description:
                'Standing calf raises to improve lower leg strength and knee stability.',
            category: 'strengthening',
            difficulty: 'easy',
            duration: 240,
            kl: '0,1,2,3',
        },
        {
            title: 'Quadricep Stretch',
            description:
                'Standing quad stretch to maintain flexibility in the front thigh muscles.',
            category: 'stretching',
            difficulty: 'easy',
            duration: 180,
            kl: '0,1,2',
        },
        {
            title: 'Ankle Circles',
            description:
                'Gentle ankle rotation exercises to improve circulation and joint mobility.',
            category: 'mobility',
            difficulty: 'easy',
            duration: 120,
            kl: '0,1,2,3,4',
        },
        {
            title: 'Side Leg Raises',
            description:
                'Lateral leg raise exercises to strengthen hip abductors and improve knee alignment.',
            category: 'strengthening',
            difficulty: 'medium',
            duration: 300,
            kl: '0,1,2',
        },
        {
            title: 'Knee Flexion Stretch',
            description:
                'Controlled knee bending exercise to maintain range of motion.',
            category: 'stretching',
            difficulty: 'easy',
            duration: 240,
            kl: '0,1,2,3',
        },
        {
            title: 'Chair Stand Exercise',
            description:
                'Sit-to-stand exercise to build functional leg strength for daily activities.',
            category: 'functional',
            difficulty: 'medium',
            duration: 300,
            kl: '0,1,2',
        },
        {
            title: 'Gentle Walking Guide',
            description:
                'Structured walking program with proper form guidance for knee OA patients.',
            category: 'cardio',
            difficulty: 'easy',
            duration: 600,
            kl: '0,1,2,3',
        },
        {
            title: 'Pool Exercises',
            description:
                'Water-based exercises that reduce joint stress while building strength.',
            category: 'low-impact',
            difficulty: 'easy',
            duration: 480,
            kl: '0,1,2,3,4',
        },
    ];

    for (const v of videos) {
        await database.runAsync(
            `INSERT INTO video_references
             (title, description, video_url, thumbnail_url, category, difficulty, duration_seconds, target_kl_grades)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [v.title, v.description, '', '', v.category, v.difficulty, v.duration, v.kl]
        );
    }
};

// ── Sync Log ───────────────────────────────────────────────────

const logSyncAction = async (tableName, recordId, action) => {
    const database = await getDatabase();
    await database.runAsync(
        `INSERT INTO sync_log (table_name, record_id, action, attempted_at)
         VALUES (?, ?, ?, datetime('now'))`,
        [tableName, recordId, action]
    );
};

export const getPendingSyncItems = async () => {
    const database = await getDatabase();
    return await database.getAllAsync(
        "SELECT * FROM sync_log WHERE status = 'pending' ORDER BY attempted_at"
    );
};

export const markSynced = async (syncLogId) => {
    const database = await getDatabase();
    await database.runAsync(
        "UPDATE sync_log SET status = 'completed', completed_at = datetime('now') WHERE id = ?",
        [syncLogId]
    );
};

export const markSyncFailed = async (syncLogId, errorMessage) => {
    const database = await getDatabase();
    await database.runAsync(
        "UPDATE sync_log SET status = 'failed', error_message = ?, attempted_at = datetime('now') WHERE id = ?",
        [errorMessage, syncLogId]
    );
};

// ── Cleanup ────────────────────────────────────────────────────

export const clearAllData = async () => {
    const database = await getDatabase();
    await database.execAsync(`
        DELETE FROM sync_log;
        DELETE FROM recommendations;
        DELETE FROM scan_history;
        DELETE FROM questionnaire_responses;
        DELETE FROM users;
    `);
};
