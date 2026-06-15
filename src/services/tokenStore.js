import * as SecureStore from 'expo-secure-store';

const AUTH_STATE_KEY = 'kneeoa.auth.state.v1';

const readJson = async (key) => {
    const value = await SecureStore.getItemAsync(key);
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
    if (!accessToken && !refreshToken) {
        await SecureStore.deleteItemAsync(AUTH_STATE_KEY);
        return;
    }

    await SecureStore.setItemAsync(
        AUTH_STATE_KEY,
        JSON.stringify({
            accessToken: accessToken || null,
            refreshToken: refreshToken || null,
        })
    );
};

export const clearStoredAuthState = async () => {
    await SecureStore.deleteItemAsync(AUTH_STATE_KEY);
};
