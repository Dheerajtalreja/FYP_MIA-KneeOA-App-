import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const AUTH_STATE_KEY = 'kneeoa.auth.state.v1';

// Web storage helper (falls back to localStorage)
const webStorage = {
    setItem: (key, value) => {
        try {
            localStorage.setItem(key, value);
        } catch (error) {
            console.error('[tokenStore] Web storage failed:', error);
        }
    },
    getItem: (key) => {
        try {
            return localStorage.getItem(key);
        } catch (error) {
            console.error('[tokenStore] Web storage failed:', error);
            return null;
        }
    },
    removeItem: (key) => {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('[tokenStore] Web storage failed:', error);
        }
    },
};

const readJson = async (key) => {
    const value = Platform.OS === 'web' 
        ? webStorage.getItem(key)
        : await SecureStore.getItemAsync(key);
    
    if (!value) return null;

    try {
        return JSON.parse(value);
    } catch {
        return null;
    }
};

export const loadStoredAuthState = async () => {
    const state = await readJson(AUTH_STATE_KEY);
    return {
        accessToken: state?.accessToken || null,
        refreshToken: state?.refreshToken || null,
    };
};

export const persistStoredAuthState = async ({ accessToken = null, refreshToken = null } = {}) => {
    const data = JSON.stringify({
        accessToken: accessToken || null,
        refreshToken: refreshToken || null,
    });

    if (Platform.OS === 'web') {
        if (!accessToken && !refreshToken) {
            webStorage.removeItem(AUTH_STATE_KEY);
            return;
        }
        webStorage.setItem(AUTH_STATE_KEY, data);
    } else {
        if (!accessToken && !refreshToken) {
            await SecureStore.deleteItemAsync(AUTH_STATE_KEY);
            return;
        }
        await SecureStore.setItemAsync(AUTH_STATE_KEY, data);
    }
};

export const clearStoredAuthState = async () => {
    if (Platform.OS === 'web') {
        webStorage.removeItem(AUTH_STATE_KEY);
    } else {
        await SecureStore.deleteItemAsync(AUTH_STATE_KEY);
    }
};
