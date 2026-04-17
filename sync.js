// ─── Data Synchronization Service ──────────────────────────────
// Syncs pending local changes with the cloud PostgreSQL database
// when network connectivity is available.

import { getPendingSyncItems, markSynced, markSyncFailed, getDatabase } from './database';
import { syncDataToCloud, isOnline } from './api';

let isSyncing = false;

/**
 * Attempt to sync all pending local records to the cloud.
 * Skips gracefully if already syncing or offline.
 */
export const performSync = async () => {
    if (isSyncing) {
        console.log('[Sync] Already in progress, skipping.');
        return { synced: 0, failed: 0 };
    }

    const online = await isOnline();
    if (!online) {
        console.log('[Sync] Device is offline, deferring sync.');
        return { synced: 0, failed: 0, offline: true };
    }

    isSyncing = true;
    let synced = 0;
    let failed = 0;

    try {
        const pendingItems = await getPendingSyncItems();
        console.log(`[Sync] ${pendingItems.length} items pending.`);

        for (const item of pendingItems) {
            try {
                const record = await fetchRecordForSync(item.table_name, item.record_id);
                if (!record) {
                    await markSynced(item.id); // Record was deleted locally
                    continue;
                }

                await syncDataToCloud({
                    table: item.table_name,
                    action: item.action,
                    record,
                });

                await markSynced(item.id);
                synced++;
            } catch (error) {
                console.warn(`[Sync] Failed to sync item ${item.id}:`, error.message);
                await markSyncFailed(item.id, error.message);
                failed++;
            }
        }
    } catch (error) {
        console.error('[Sync] Sync process error:', error.message);
    } finally {
        isSyncing = false;
    }

    console.log(`[Sync] Complete: ${synced} synced, ${failed} failed.`);
    return { synced, failed };
};

/**
 * Look up the actual record from its table for upload.
 */
const fetchRecordForSync = async (tableName, recordId) => {
    const db = await getDatabase();
    const allowedTables = [
        'questionnaire_responses',
        'scan_history',
        'recommendations',
        'users',
    ];
    if (!allowedTables.includes(tableName)) return null;

    return await db.getFirstAsync(
        `SELECT * FROM ${tableName} WHERE id = ?`,
        [recordId]
    );
};

/**
 * Schedule periodic sync (call once on app start).
 * Runs every 5 minutes while the app is in the foreground.
 */
let syncInterval = null;

export const startPeriodicSync = (intervalMs = 5 * 60 * 1000) => {
    if (syncInterval) return;
    syncInterval = setInterval(performSync, intervalMs);
    // Also run immediately on start
    performSync();
};

export const stopPeriodicSync = () => {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
    }
};
