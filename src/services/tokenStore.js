import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const AUTH_STATE_KEY = 'kneeoa.auth.state.v1';

const webStorage = {
    setItem: (key, value) => { try { localStorage.setItem(key, value); } catch (e) {} },
    getItem: (key) => { try { return localStorage.getItem(key); } catch (e) { return null; } },
    removeItem: (key) => { try { localStorage.removeItem(key); } catch (e) {} },
};

export const loadStoredAuthState = async () => {
    const value = Platform.OS === 'web' ? webStorage.getItem(AUTH_STATE_KEY) : await SecureStore.getItemAsync(AUTH_STATE_KEY);
    if (!value) return { accessToken: null, refreshToken: null };
    try {
        const state = JSON.parse(value);
        return { accessToken: state?.accessToken || null, refreshToken: state?.refreshToken || null };
    } catch (e) { return { accessToken: null, refreshToken: null }; }
};

export const persistStoredAuthState = async ({ accessToken = null, refreshToken = null } = {}) => {
    const data = JSON.stringify({ accessToken, refreshToken });
    if (Platform.OS === 'web') {
        if (!accessToken && !refreshToken) webStorage.removeItem(AUTH_STATE_KEY);
        else webStorage.setItem(AUTH_STATE_KEY, data);
    } else {
        if (!accessToken && !refreshToken) await SecureStore.deleteItemAsync(AUTH_STATE_KEY);
        else await SecureStore.setItemAsync(AUTH_STATE_KEY, data);
    }
};

export const clearStoredAuthState = async () => {
    if (Platform.OS === 'web') webStorage.removeItem(AUTH_STATE_KEY);
    else await SecureStore.deleteItemAsync(AUTH_STATE_KEY);
};
