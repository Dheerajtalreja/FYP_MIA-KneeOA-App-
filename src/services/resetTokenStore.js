// ─── Reset Token Storage ──────────────────────────────────────
// Securely stores the password reset token from deep links.
// Uses expo-secure-store for encrypted storage.

import * as SecureStore from 'expo-secure-store';

const RESET_TOKEN_KEY = 'reset_password_token';

export const storeResetToken = async (token) => {
    try {
        await SecureStore.setItemAsync(RESET_TOKEN_KEY, token);
    } catch (error) {
        console.error('Failed to store reset token:', error);
    }
};

export const getResetToken = async () => {
    try {
        return await SecureStore.getItemAsync(RESET_TOKEN_KEY);
    } catch (error) {
        console.error('Failed to retrieve reset token:', error);
        return null;
    }
};

export const clearResetToken = async () => {
    try {
        await SecureStore.deleteItemAsync(RESET_TOKEN_KEY);
    } catch (error) {
        console.error('Failed to clear reset token:', error);
    }
};
