// ─── SQLite Local Database Service ─────────────────────────────
// Offline-first storage using expo-sqlite for caching user data.

import { Platform } from 'react-native';
import * as SQLite from 'expo-sqlite';

const DB_NAME = 'kneeoa_local.db';
let db = null;
let dbPromise = null;

// Check if we're on web platform
const isWeb = Platform.OS === 'web';

// ─── Web Platform Mock Storage ────────────────────────────────
const webStorage = {
    data: {},
    setItem: (key, value) => {
        try {
            localStorage.setItem(`kneeoa_${key}`, JSON.stringify(value));
        } catch (e) {}
    },
    getItem: (key) => {
        try {
            const stored = localStorage.getItem(`kneeoa_${key}`);
            return stored ? JSON.parse(stored) : null;
        } catch (e) { return null; }
    },
    removeItem: (key) => {
        try { localStorage.removeItem(`kneeoa_${key}`); } catch (e) {}
    }
};

const webGetScans = (userId) => {
    const scans = webStorage.getItem('scans') || [];
    return Array.isArray(scans) ? scans.filter(s => s.user_id === userId) : [];
};

const webGetRecommendations = (userId) => {
    const recs = webStorage.getItem('recommendations') || [];
    return Array.isArray(recs) ? recs.filter(r => r.user_id === userId) : [];
};

// ── Initialisation ─────────────────────────────────────────────

export const getDatabase = async () => {
    try {
        if (isWeb) {
            return {
                getAllAsync: async (query, params) => {
                    if (query.includes('FROM users')) {
                        const u = webStorage.getItem('user');
                        return u ? [u] : [];
                    }
                    if (query.includes('FROM scan_history')) return webGetScans(params?.[0]);
                    if (query.includes('FROM questionnaire_responses')) {
                        const q = webStorage.getItem('questionnaire');
                        return q && q.user_id === params?.[0] ? [q] : [];
                    }
                    if (query.includes('FROM recommendations')) return webGetRecommendations(params?.[0]);
                    return [];
                },
                getFirstAsync: async (query, params) => {
                    if (query.includes('FROM users')) return webStorage.getItem('user');
                    if (query.includes('FROM scan_history')) return webGetScans(params?.[0])[0] || null;
                    return null;
                },
                runAsync: async () => ({ lastInsertRowId: 1 }),
                execAsync: async () => {},
                withTransactionAsync: async (task) => await task(),
            };
        }

        if (db) return db;
        if (dbPromise) return dbPromise;

        dbPromise = (async () => {
            try {
                if (!SQLite || !SQLite.openDatabaseAsync) {
                    throw new Error('expo-sqlite not properly initialized');
                }
                
                const instance = await SQLite.openDatabaseAsync(DB_NAME);
                
                // CRITICAL FIX: Enable Write-Ahead Logging (WAL) to prevent "database is locked" errors
                await instance.execAsync(`
                    PRAGMA journal_mode = WAL;
                    PRAGMA synchronous = NORMAL;
                    PRAGMA foreign_keys = ON;
                `);

                await initializeTables(instance);
                db = instance;
                return db;
            } catch (error) {
                dbPromise = null; // Reset the lock so we can try again if it failed
                console.error('[Database] Failed to initialize database:', error);
                throw error;
            }
        })();

        return dbPromise;
    } catch (error) {
        console.error('[Database] getDatabase failed:', error);
        throw error;
    }
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

export const clearLocalUserData = async () => {
    if (isWeb) {
        webStorage.removeItem('user');
        webStorage.removeItem('questionnaire');
        webStorage.removeItem('scans');
        webStorage.removeItem('recommendations');
        return;
    }
    const database = await getDatabase();
    await database.runAsync('DELETE FROM users');
    await database.runAsync('DELETE FROM questionnaire_responses');
    await database.runAsync('DELETE FROM scan_history');
    await database.runAsync('DELETE FROM recommendations');
    await database.runAsync('DELETE FROM sync_log');
};

export const saveUser = async (userData) => {
    if (isWeb) {
        webStorage.setItem('user', userData);
        return userData.id || 1;
    }
    const database = await getDatabase();
    const result = await database.runAsync(
        `INSERT OR REPLACE INTO users (server_id, email, full_name, role, token, refresh_token, profile_data, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        [userData.id || null, userData.email, userData.fullName, userData.role || 'patient', userData.token || null, userData.refreshToken || null, JSON.stringify(userData.profile || {})]
    );
    return result.lastInsertRowId;
};

export const getUser = async () => {
    if (isWeb) return webStorage.getItem('user');
    const database = await getDatabase();
    return await database.getFirstAsync('SELECT * FROM users ORDER BY updated_at DESC LIMIT 1');
};

export const saveQuestionnaireResponse = async (response) => {
    if (isWeb) {
        webStorage.setItem('questionnaire', response);
        return 1;
    }
    const database = await getDatabase();
    const result = await database.runAsync(
        `INSERT INTO questionnaire_responses (user_id, age, gender, weight, height, pain_level, pain_location, pain_duration, mobility_score, can_bend_fully, can_climb_stairs, can_walk_30min, previous_injuries, surgeries, medications, family_history, additional_notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [response.userId, response.age, response.gender, response.weight, response.height, response.painLevel, response.painLocation, response.painDuration, response.mobilityScore, response.canBendFully ? 1 : 0, response.canClimbStairs ? 1 : 0, response.canWalk30Min ? 1 : 0, response.previousInjuries, response.surgeries, response.medications, response.familyHistory ? 1 : 0, response.additionalNotes]
    );
    return result.lastInsertRowId;
};

export const getLatestQuestionnaire = async (userId) => {
    if (isWeb) {
        const q = webStorage.getItem('questionnaire');
        return q && q.user_id === userId ? q : null;
    }
    const database = await getDatabase();
    return await database.getFirstAsync('SELECT * FROM questionnaire_responses WHERE user_id = ? ORDER BY completed_at DESC LIMIT 1', [userId]);
};

export const saveScanResult = async (scanData) => {
    if (isWeb) return 1;
    const database = await getDatabase();
    const result = await database.runAsync(
        `INSERT INTO scan_history (user_id, image_uri, image_type, view_type, knee_side, kl_grade, risk_score, analysis_result, annotations)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [scanData.userId, scanData.imageUri, scanData.imageType || 'xray', scanData.viewType || 'PA', scanData.kneeSide || 'left', scanData.klGrade, scanData.riskScore, JSON.stringify(scanData.analysisResult || {}), JSON.stringify(scanData.annotations || {})]
    );
    return result.lastInsertRowId;
};

export const saveCompleteUserProfile = async (completeProfile) => {
    if (isWeb) {
        webStorage.setItem('user', completeProfile.user);
        if (completeProfile.questionnaire) webStorage.setItem('questionnaire', completeProfile.questionnaire);
        return;
    }
    const database = await getDatabase();
    try {
        await database.withTransactionAsync(async () => {
            await database.runAsync(
                `INSERT OR REPLACE INTO users (server_id, email, full_name, role, profile_data, updated_at)
                 VALUES (?, ?, ?, ?, ?, datetime('now'))`,
                [completeProfile.user?.user_id || completeProfile.user?.id || null, completeProfile.user?.email || null, completeProfile.user?.full_name || null, completeProfile.user?.role || 'patient', JSON.stringify(completeProfile.user || {})]
            );
            if (completeProfile.questionnaire) {
                const q = completeProfile.questionnaire;
                await database.runAsync(
                    `INSERT OR REPLACE INTO questionnaire_responses (user_id, age, gender, weight, height, pain_level, pain_location, pain_duration, mobility_score, can_bend_fully, can_climb_stairs, can_walk_30min, previous_injuries, surgeries, medications, family_history, additional_notes, completed_at)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
                    [completeProfile.user?.user_id || completeProfile.user?.id, q.age, q.gender, q.weight, q.height, q.pain_level, q.pain_location, q.pain_duration, q.mobility_score, q.can_bend_fully, q.can_climb_stairs, q.can_walk_30min, q.previous_injuries, q.surgeries, q.medications, q.family_history, q.additional_notes]
                );
            }
        });
    } catch (e) { console.error(e); throw e; }
};

export const getVideoLibrary = async (category = null) => {
    if (isWeb) return [];
    const database = await getDatabase();
    if (category) return await database.getAllAsync('SELECT * FROM video_references WHERE category = ? ORDER BY title', [category]);
    return await database.getAllAsync('SELECT * FROM video_references ORDER BY category, title');
};
