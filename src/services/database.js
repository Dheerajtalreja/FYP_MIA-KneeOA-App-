// ─── SQLite Local Database Service ─────────────────────────────
// Offline-first storage using expo-sqlite for caching user data,
// questionnaire responses, scan results, recommendations, and
// video references. All writes are logged for cloud sync.
// 
// Web Platform Support: Uses localStorage as fallback when expo-sqlite is unavailable.

import { Platform } from 'react-native';

const DB_NAME = 'kneeoa_local.db';
let db = null;
let sqliteLoaded = false;
let dbPromise = null; // ✅ Lock to prevent concurrent initialization

// ─── Web Platform Mock Storage ────────────────────────────────
// Simple localStorage-based mock for web development
const webStorage = {
    data: {},
    
    setItem: (key, value) => {
        try {
            webStorage.data[key] = JSON.stringify(value);
            localStorage.setItem(`kneeoa_${key}`, JSON.stringify(value));
        } catch (error) {
            console.error('[Database] Web storage setItem failed:', error);
        }
    },
    
    getItem: (key) => {
        try {
            const stored = localStorage.getItem(`kneeoa_${key}`);
            if (stored) {
                return JSON.parse(stored);
            }
            return webStorage.data[key] || null;
        } catch (error) {
            console.error('[Database] Web storage getItem failed:', error);
            return null;
        }
    },
    
    removeItem: (key) => {
        try {
            delete webStorage.data[key];
            localStorage.removeItem(`kneeoa_${key}`);
        } catch (error) {
            console.error('[Database] Web storage removeItem failed:', error);
        }
    },
    
    clear: () => {
        try {
            webStorage.data = {};
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('kneeoa_')) {
                    localStorage.removeItem(key);
                }
            });
        } catch (error) {
            console.error('[Database] Web storage clear failed:', error);
        }
    },
    
    getAllKeys: () => {
        try {
            const keys = [];
            Object.keys(localStorage).forEach(key => {
                if (key.startsWith('kneeoa_')) {
                    keys.push(key.replace('kneeoa_', ''));
                }
            });
            return keys;
        } catch (error) {
            console.error('[Database] Web storage getAllKeys failed:', error);
            return [];
        }
    }
};

// Check if we're on web platform
const isWeb = Platform.OS === 'web';

// ─── Lazy SQLite Loading ──────────────────────────────────────
// Dynamically load expo-sqlite to avoid WebAssembly errors on web

const loadSQLite = async () => {
    if (sqliteLoaded) return SQLite;
    
    if (Platform.OS === 'web') {
        console.warn('[Database] expo-sqlite not available on web platform');
        return null;
    }
    
    try {
        const SQLite = await import('expo-sqlite');
        sqliteLoaded = true;
        return SQLite;
    } catch (error) {
        console.error('[Database] Failed to load expo-sqlite:', error);
        throw error;
    }
};

// Web storage keys
const WEB_KEY_USER = 'user';
const WEB_KEY_QUESTIONNAIRE = 'questionnaire';
const WEB_KEY_SCANS = 'scans';
const WEB_KEY_RECOMMENDATIONS = 'recommendations';
const WEB_KEY_VIDEOS = 'videos';
const WEB_KEY_SYNC_LOG = 'sync_log';

// ─── Web Platform Helper Functions ────────────────────────────
// No-op functions for operations that don't make sense on web

const webNoOp = () => {
    return null;
};

// User data helpers
const webGetUser = () => {
    try {
        const stored = localStorage.getItem(`kneeoa_${WEB_KEY_USER}`);
        return stored ? JSON.parse(stored) : null;
    } catch (error) {
        console.error('[Database] webGetUser failed:', error);
        return null;
    }
};

const webSaveUser = (userData) => {
    try {
        webStorage.setItem(WEB_KEY_USER, userData);
    } catch (error) {
        console.error('[Database] webSaveUser failed:', error);
    }
};

const webClearUserData = () => {
    try {
        localStorage.removeItem(`kneeoa_${WEB_KEY_USER}`);
        localStorage.removeItem(`kneeoa_${WEB_KEY_QUESTIONNAIRE}`);
        localStorage.removeItem(`kneeoa_${WEB_KEY_SCANS}`);
        localStorage.removeItem(`kneeoa_${WEB_KEY_RECOMMENDATIONS}`);
        webStorage.data = {};
    } catch (error) {
        console.error('[Database] webClearUserData failed:', error);
    }
};

// Profile data helpers
const webSaveCompleteProfile = (completeProfile) => {
    try {
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
    } catch (error) {
        console.error('[Database] webSaveCompleteProfile failed:', error);
    }
};

// Questionnaire helpers
const webGetQuestionnaire = (userId) => {
    try {
        const stored = localStorage.getItem(`kneeoa_${WEB_KEY_QUESTIONNAIRE}`);
        const data = stored ? JSON.parse(stored) : null;
        if (data && data.user_id === userId) {
            return data;
        }
        return null;
    } catch (error) {
        console.error('[Database] webGetQuestionnaire failed:', error);
        return null;
    }
};

// Scan history helpers
const webGetScans = (userId) => {
    try {
        const stored = localStorage.getItem(`kneeoa_${WEB_KEY_SCANS}`);
        const scans = stored ? JSON.parse(stored) : [];
        if (Array.isArray(scans)) {
            return scans.filter(scan => scan.user_id === userId);
        }
        return [];
    } catch (error) {
        console.error('[Database] webGetScans failed:', error);
        return [];
    }
};

// Recommendations helpers
const webGetRecommendations = (userId) => {
    try {
        const stored = localStorage.getItem(`kneeoa_${WEB_KEY_RECOMMENDATIONS}`);
        const recs = stored ? JSON.parse(stored) : [];
        if (Array.isArray(recs)) {
            return recs.filter(rec => rec.user_id === userId);
        }
        return [];
    } catch (error) {
        console.error('[Database] webGetRecommendations failed:', error);
        return [];
    }
};

// ── Initialisation ─────────────────────────────────────────────

export const getDatabase = async () => {
    if (db) return db;
    
    if (isWeb) {
        console.log('[Database] Web platform: Returning mock database object');
        // Minimal mock to prevent crashes on web
        return {
            getAllAsync: async (query, params) => {
                if (query.includes('FROM users')) return [webGetUser()].filter(Boolean);
                if (query.includes('FROM scan_history')) return webGetScans(params?.[0]);
                if (query.includes('FROM questionnaire_responses')) return [webGetQuestionnaire(params?.[0])].filter(Boolean);
                if (query.includes('FROM recommendations')) return webGetRecommendations(params?.[0]);
                return [];
            },
            getFirstAsync: async (query, params) => {
                if (query.includes('FROM users')) return webGetUser();
                if (query.includes('FROM scan_history')) return webGetScans(params?.[0])[0] || null;
                if (query.includes('FROM questionnaire_responses')) return webGetQuestionnaire(params?.[0]);
                return null;
            },
            runAsync: async () => ({ lastInsertRowId: 1, changes: 1 }),
            execAsync: async () => {},
            withTransactionAsync: async (task) => await task(),
        };
    }

    if (dbPromise) return dbPromise;

    dbPromise = (async () => {
        try {
            const SQLite = await loadSQLite();
            if (!SQLite) {
                throw new Error('expo-sqlite not available');
            }

            const instance = await SQLite.openDatabaseAsync(DB_NAME);
            await initializeTables(instance);
            db = instance;
            return db;
        } catch (error) {
            dbPromise = null;
            throw error;
        }
    })();

    return dbPromise;
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
            refresh_token TEXT,
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

    await database.runAsync('UPDATE users SET token = NULL, refresh_token = NULL');
};

// ── User Operations ────────────────────────────────────────────

/**
 * Clear all local user data (except video references) before syncing fresh data from backend.
 * This ensures we don't have stale data mixed with new server data.
 */
export const clearLocalUserData = async () => {
    if (isWeb) {
        console.log('[Database] Clearing local user data (web)...');
        webClearUserData();
        console.log('[Database] Local user data cleared successfully (web)');
        return;
    }
    
    const database = await getDatabase();
    
    console.log('[Database] Clearing local user data...');
    
    // Clear user record
    await database.runAsync('DELETE FROM users');
    
    // Clear questionnaire responses
    await database.runAsync('DELETE FROM questionnaire_responses');
    
    // Clear scan history
    await database.runAsync('DELETE FROM scan_history');
    
    // Clear recommendations
    await database.runAsync('DELETE FROM recommendations');
    
    // Clear sync log
    await database.runAsync('DELETE FROM sync_log');
    
    // Keep video references (they're static content)
    
    console.log('[Database] Local user data cleared successfully');
};

export const saveUser = async (userData) => {
    if (isWeb) {
        console.log('[Database] Saving user (web)...');
        webSaveUser(userData);
        return userData.id || null;
    }
    
    const database = await getDatabase();
    const result = await database.runAsync(
        `INSERT OR REPLACE INTO users
         (server_id, email, full_name, role, token, refresh_token, profile_data, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [
            userData.id || null,
            userData.email,
            userData.fullName,
            userData.role || 'patient',
            userData.token || null,
            userData.refreshToken || null,
            JSON.stringify(userData.profile || {}),
        ]
    );
    return result.lastInsertRowId;
};

export const getUser = async () => {
    if (isWeb) {
        console.log('[Database] Getting user (web)...');
        return webGetUser();
    }
    
    const database = await getDatabase();
    return await database.getFirstAsync(
        'SELECT * FROM users ORDER BY updated_at DESC LIMIT 1'
    );
};

export const deleteUser = async () => {
    if (isWeb) {
        console.log('[Database] Web platform: SQLite operation bypassed');
        return null;
    }
    
    const database = await getDatabase();
    await database.runAsync('DELETE FROM users');
};

// ── Questionnaire Operations ───────────────────────────────────

export const saveQuestionnaireResponse = async (response) => {
    if (isWeb) {
        console.log('[Database] Web platform: SQLite operation bypassed');
        return null;
    }
    
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
    if (isWeb) {
        console.log('[Database] Getting latest questionnaire (web)...');
        return webGetQuestionnaire(userId);
    }
    
    const database = await getDatabase();
    return await database.getFirstAsync(
        'SELECT * FROM questionnaire_responses WHERE user_id = ? ORDER BY completed_at DESC LIMIT 1',
        [userId]
    );
};

export const getAllQuestionnaires = async (userId) => {
    if (isWeb) {
        console.log('[Database] Web platform: SQLite operation bypassed');
        return [];
    }
    
    const database = await getDatabase();
    return await database.getAllAsync(
        'SELECT * FROM questionnaire_responses WHERE user_id = ? ORDER BY completed_at DESC',
        [userId]
    );
};

// ── Scan Operations ────────────────────────────────────────────

export const saveScanResult = async (scanData) => {
    if (isWeb) {
        console.log('[Database] Web platform: SQLite operation bypassed');
        return null;
    }
    
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
    if (isWeb) {
        console.log('[Database] Getting scan history (web)...');
        return webGetScans(userId);
    }
    
    const database = await getDatabase();
    return await database.getAllAsync(
        'SELECT * FROM scan_history WHERE user_id = ? ORDER BY scanned_at DESC',
        [userId]
    );
};

export const getScanById = async (scanId) => {
    if (isWeb) {
        console.log('[Database] Web platform: SQLite operation bypassed');
        return null;
    }
    
    const database = await getDatabase();
    return await database.getFirstAsync(
        'SELECT * FROM scan_history WHERE id = ?',
        [scanId]
    );
};

// ── Recommendations Operations ─────────────────────────────────

export const saveRecommendation = async (recData) => {
    if (isWeb) {
        console.log('[Database] Web platform: SQLite operation bypassed');
        return null;
    }
    
    const database = await getDatabase();
    const result = await database.runAsync(
        `INSERT INTO recommendations
         (user_id, scan_id, recommendation_text, exercises, lifestyle_tips)
         VALUES (?, ?, ?, ?, ?)`,
        [
            recData.userId,
            recData.scanId,
            recData.text,
        ]
    );
    await logSyncAction('recommendations', result.lastInsertRowId, 'insert');
    return result.lastInsertRowId;
};

// ── Batch Save Functions for Fetch-and-Sync Pattern ────────────

/**
 * Save complete user profile data from backend in one transaction.
 * This is the main function for the Fetch-and-Sync pattern.
 */
export const saveCompleteUserProfile = async (completeProfile) => {
    if (isWeb) {
        console.log('[Database] Saving complete user profile (web)...');
        webSaveCompleteProfile(completeProfile);
        console.log('[Database] Complete user profile saved successfully (web)');
        return;
    }
    
    const database = await getDatabase();
    
    console.log('[Database] Saving complete user profile...');
    
    try {
        // Use transaction to ensure atomicity
        await database.withTransactionAsync(async () => {
            // Save user
            await database.runAsync(
                `INSERT OR REPLACE INTO users
                 (server_id, email, full_name, role, token, refresh_token, profile_data, updated_at)
                 VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
                [
                    completeProfile.user?.user_id || completeProfile.user?.id || null,
                    completeProfile.user?.email || null,
                    completeProfile.user?.full_name || null,
                    completeProfile.user?.role || 'patient',
                    null, // token will be set separately
                    null, // refresh_token will be set separately
                    JSON.stringify(completeProfile.user || {}),
                ]
            );

            // Save questionnaire if exists
            if (completeProfile.questionnaire) {
                const q = completeProfile.questionnaire;
                await database.runAsync(
                    `INSERT OR REPLACE INTO questionnaire_responses
                     (user_id, age, gender, weight, height, pain_level, pain_location, pain_duration,
                      mobility_score, can_bend_fully, can_climb_stairs, can_walk_30min,
                      previous_injuries, surgeries, medications, family_history, additional_notes, completed_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
                    [
                        completeProfile.user?.user_id || completeProfile.user?.id,
                        q.age, q.gender, q.weight, q.height,
                        q.pain_level, q.pain_location, q.pain_duration,
                        q.mobility_score, q.can_bend_fully, q.can_climb_stairs, q.can_walk_30min,
                        q.previous_injuries, q.surgeries, q.medications, q.family_history, q.additional_notes,
                    ]
                );
            }

            // Save scan history
            if (completeProfile.scanHistory && Array.isArray(completeProfile.scanHistory)) {
                for (const scan of completeProfile.scanHistory) {
                    await database.runAsync(
                        `INSERT OR REPLACE INTO scan_history
                         (user_id, image_uri, image_type, view_type, knee_side, kl_grade, risk_score,
                          analysis_result, annotations, scanned_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            completeProfile.user?.user_id || completeProfile.user?.id,
                            scan.image_uri, scan.image_type, scan.view_type, scan.knee_side,
                            scan.kl_grade, scan.risk_score,
                            JSON.stringify(scan.analysis_result || {}),
                            JSON.stringify(scan.annotations || {}),
                            scan.scanned_at || new Date().toISOString(),
                        ]
                    );
                }
            }

            // Save recommendations
            if (completeProfile.recommendations && Array.isArray(completeProfile.recommendations)) {
                for (const rec of completeProfile.recommendations) {
                    await database.runAsync(
                        `INSERT INTO recommendations
                         (user_id, scan_id, recommendation_text, exercises, lifestyle_tips)
                         VALUES (?, ?, ?, ?, ?)`,
                        [
                            completeProfile.user?.user_id || completeProfile.user?.id,
                            rec.scan_id || null,
                            rec.text || rec.recommendation_text,
                            JSON.stringify(rec.exercises || []),
                            JSON.stringify(rec.lifestyle_tips || []),
                        ]
                    );
                }
            }
        });
        console.log('[Database] Complete user profile saved successfully');
    } catch (error) {
        console.error('[Database] Failed to save complete user profile:', error);
        throw error;
    }
};

export const getRecommendations = async (userId) => {
    if (isWeb) {
        console.log('[Database] Getting recommendations (web)...');
        return webGetRecommendations(userId);
    }
    
    const database = await getDatabase();
    return await database.getAllAsync(
        'SELECT * FROM recommendations WHERE user_id = ? ORDER BY generated_at DESC',
        [userId]
    );
};

export const getRecommendationForScan = async (scanId) => {
    if (isWeb) {
        console.log('[Database] Web platform: SQLite operation bypassed');
        return null;
    }
    
    const database = await getDatabase();
    return await database.getFirstAsync(
        'SELECT * FROM recommendations WHERE scan_id = ?',
        [scanId]
    );
};

// ── Video Library Operations ───────────────────────────────────

export const getVideoLibrary = async (category = null) => {
    if (isWeb) {
        console.log('[Database] Web platform: SQLite operation bypassed');
        return [];
    }
    
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
    if (isWeb) {
        console.log('[Database] Web platform: SQLite operation bypassed');
        return;
    }
    
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
    if (isWeb) {
        return;
    }
    
    const database = await getDatabase();
    await database.runAsync(
        `INSERT INTO sync_log (table_name, record_id, action, attempted_at)
         VALUES (?, ?, ?, datetime('now'))`,
        [tableName, recordId, action]
    );
};

export const getPendingSyncItems = async () => {
    if (isWeb) {
        console.log('[Database] Web platform: SQLite operation bypassed');
        return [];
    }
    
    const database = await getDatabase();
    return await database.getAllAsync(
        "SELECT * FROM sync_log WHERE status = 'pending' ORDER BY attempted_at"
    );
};

export const markSynced = async (syncLogId) => {
    if (isWeb) {
        console.log('[Database] Web platform: SQLite operation bypassed');
        return;
    }
    
    const database = await getDatabase();
    await database.runAsync(
        "UPDATE sync_log SET status = 'completed', completed_at = datetime('now') WHERE id = ?",
        [syncLogId]
    );
};

export const markSyncFailed = async (syncLogId, errorMessage) => {
    if (isWeb) {
        console.log('[Database] Web platform: SQLite operation bypassed');
        return;
    }
    
    const database = await getDatabase();
    await database.runAsync(
        "UPDATE sync_log SET status = 'failed', error_message = ?, attempted_at = datetime('now') WHERE id = ?",
        [errorMessage, syncLogId]
    );
};

// ── Cleanup ────────────────────────────────────────────────────

export const clearAllData = async () => {
    if (isWeb) {
        console.log('[Database] Web platform: SQLite operation bypassed');
        return;
    }
    
    const database = await getDatabase();
    await database.execAsync(`
        DELETE FROM sync_log;
        DELETE FROM recommendations;
        DELETE FROM scan_history;
        DELETE FROM questionnaire_responses;
        DELETE FROM users;
    `);
};
