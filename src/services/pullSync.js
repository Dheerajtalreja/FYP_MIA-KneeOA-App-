// ─── Pull Sync Service ────────────────────────────────────────────
// Fetches user data from backend and syncs to local SQLite database.
// Runs after login to populate offline-first data for questionnaires, scans, recommendations.

import { fetchLatestFromCloud } from './apiCore';
import {
    saveCompleteUserProfile,
    saveScanResult,
    saveRecommendation,
    getDatabase,
} from './database';

export const performPullSync = async (userId) => {
    if (!userId) {
        console.warn('[PullSync] No user ID provided, skipping sync');
        return { success: false, error: 'No user ID' };
    }

    try {
        console.log('[PullSync] Starting pull sync for user:', userId);

        // Fetch all user data from backend
        const cloudData = await fetchLatestFromCloud();
        
        if (!cloudData) {
            console.warn('[PullSync] No data returned from cloud');
            return { success: false, error: 'No cloud data', recordsCount: 0 };
        }

        console.log('[PullSync] Cloud data received:', {
            hasUser: !!cloudData.user,
            hasQuestionnaire: !!cloudData.questionnaire,
            scansCount: Array.isArray(cloudData.scans) ? cloudData.scans.length : 0,
            recommendationsCount: Array.isArray(cloudData.recommendations) ? cloudData.recommendations.length : 0,
        });

        let recordsCount = 0;

        // Save user profile and questionnaire
        if (cloudData.user) {
            try {
                await saveCompleteUserProfile({
                    user: cloudData.user,
                    questionnaire: cloudData.questionnaire,
                });
                recordsCount += 2; // User + Questionnaire
                console.log('[PullSync] User profile and questionnaire saved');
            } catch (error) {
                console.error('[PullSync] Failed to save user profile:', error);
            }
        }

        // Save scans (X-ray images and analysis results)
        if (Array.isArray(cloudData.scans) && cloudData.scans.length > 0) {
            try {
                for (const scan of cloudData.scans) {
                    if (scan.user_id === userId || scan.userId === userId) {
                        await saveScanResult({
                            userId: userId,
                            imageUri: scan.image_uri || scan.imageUri || null,
                            imageType: scan.image_type || scan.imageType || 'xray',
                            viewType: scan.view_type || scan.viewType || 'PA',
                            kneeSide: scan.knee_side || scan.kneeSide || 'left',
                            klGrade: scan.kl_grade || scan.klGrade,
                            riskScore: scan.risk_score || scan.riskScore,
                            analysisResult: scan.analysis_result || scan.analysisResult || {},
                            annotations: scan.annotations || {},
                        });
                        recordsCount++;
                    }
                }
                console.log('[PullSync] Saved', cloudData.scans.length, 'scan records');
            } catch (error) {
                console.error('[PullSync] Failed to save scans:', error);
            }
        }

        // Save recommendations
        if (Array.isArray(cloudData.recommendations) && cloudData.recommendations.length > 0) {
            try {
                for (const rec of cloudData.recommendations) {
                    if (rec.user_id === userId || rec.userId === userId) {
                        await saveRecommendation({
                            userId: userId,
                            scanId: rec.scan_id || rec.scanId,
                            recommendationText: rec.recommendation_text || rec.recommendationText || '',
                            exercises: rec.exercises || [],
                            lifestyleTips: rec.lifestyle_tips || rec.lifestyleTips || [],
                        });
                        recordsCount++;
                    }
                }
                console.log('[PullSync] Saved', cloudData.recommendations.length, 'recommendation records');
            } catch (error) {
                console.error('[PullSync] Failed to save recommendations:', error);
            }
        }

        // Log sync completion
        await logSyncEvent('pull_sync', 'completed', null, `Synced ${recordsCount} records`);

        console.log('[PullSync] Pull sync completed successfully. Total records:', recordsCount);
        return {
            success: true,
            recordsCount,
            scansCount: Array.isArray(cloudData.scans) ? cloudData.scans.length : 0,
            recommendationsCount: Array.isArray(cloudData.recommendations) ? cloudData.recommendations.length : 0,
        };

    } catch (error) {
        console.error('[PullSync] Sync error:', error);
        await logSyncEvent('pull_sync', 'failed', error.message);
        return {
            success: false,
            error: error.message || 'Sync failed',
            recordsCount: 0,
        };
    }
};

// Save recommendation record to local database
const saveRecommendation = async (recData) => {
    const database = await getDatabase();
    const result = await database.runAsync(
        `INSERT OR REPLACE INTO recommendations (user_id, scan_id, recommendation_text, exercises, lifestyle_tips)
         VALUES (?, ?, ?, ?, ?)`,
        [
            recData.userId,
            recData.scanId || null,
            recData.recommendationText || '',
            JSON.stringify(recData.exercises || []),
            JSON.stringify(recData.lifestyleTips || []),
        ]
    );
    return result.lastInsertRowId;
};

// Log sync events for debugging and status display
const logSyncEvent = async (eventType, status, errorMessage = null, details = null) => {
    const database = await getDatabase();
    try {
        await database.runAsync(
            `INSERT INTO sync_log (table_name, action, status, attempted_at, error_message)
             VALUES (?, ?, ?, datetime('now'), ?)`,
            [eventType, 'sync', status, errorMessage || null]
        );
    } catch (e) {
        console.warn('[PullSync] Failed to log sync event:', e);
    }
};

// Get last sync timestamp for UI display
export const getLastSyncTime = async () => {
    const database = await getDatabase();
    try {
        const result = await database.getFirstAsync(
            `SELECT attempted_at FROM sync_log WHERE action = 'sync' ORDER BY attempted_at DESC LIMIT 1`
        );
        return result?.attempted_at || null;
    } catch (e) {
        console.warn('[PullSync] Failed to get last sync time:', e);
        return null;
    }
};

// Get sync statistics for dashboard
export const getSyncStats = async (userId) => {
    const database = await getDatabase();
    try {
        const userRes = await database.getFirstAsync(
            `SELECT COUNT(*) as count FROM users WHERE server_id = ? OR email = ?`,
            [userId, userId]
        );
        const scansRes = await database.getFirstAsync(
            `SELECT COUNT(*) as count FROM scan_history WHERE user_id = ?`,
            [userId]
        );
        const recsRes = await database.getFirstAsync(
            `SELECT COUNT(*) as count FROM recommendations WHERE user_id = ?`,
            [userId]
        );
        const questionnaireRes = await database.getFirstAsync(
            `SELECT COUNT(*) as count FROM questionnaire_responses WHERE user_id = ?`,
            [userId]
        );

        return {
            usersCount: userRes?.count || 0,
            scansCount: scansRes?.count || 0,
            recommendationsCount: recsRes?.count || 0,
            questionnairesCount: questionnaireRes?.count || 0,
            totalCount: (userRes?.count || 0) + (scansRes?.count || 0) + (recsRes?.count || 0),
        };
    } catch (e) {
        console.warn('[PullSync] Failed to get sync stats:', e);
        return {
            usersCount: 0,
            scansCount: 0,
            recommendationsCount: 0,
            questionnairesCount: 0,
            totalCount: 0,
        };
    }
};
