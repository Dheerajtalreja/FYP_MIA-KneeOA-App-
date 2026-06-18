export * from './apiCore';
// ─── Backend API Service ───────────────────────────────────────
// Communicates with the backend API and keeps the base URL
// configurable through Expo environment variables.

const DEFAULT_BASE_URL = 'https://kneeoa.online';

import { getUser, saveUser } from './database';

const getBackendBaseUrl = () =>
    (process.env.EXPO_PUBLIC_BACKEND_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');

const buildUrl = (path) => `${getBackendBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;

let authToken = null;
let refreshToken = null;

export const setAuthToken = (token) => {
    authToken = token;
};

export const setRefreshToken = (token) => {
    refreshToken = token;
};

export const clearAuthTokens = () => {
    authToken = null;
    refreshToken = null;
};

export const getBackendUrl = () => getBackendBaseUrl();

const getHeaders = (additional = {}) => ({
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...additional,
});

const parseResponseBody = async (response) => {
    if (response.status === 204) {
        return null;
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        return response.json();
    }

    return response.text();
};

const extractErrorMessage = (payload) => {
    if (payload === null || payload === undefined) {
        return null;
    }

    if (typeof payload === 'string') {
        return payload.trim() || null;
    }

    if (typeof payload === 'number' || typeof payload === 'boolean') {
        return String(payload);
    }

    if (Array.isArray(payload)) {
        const messages = payload
            .map((item) => extractErrorMessage(item))
            .filter(Boolean);

        return messages.length ? messages.join(' ') : null;
    }

    if (typeof payload === 'object') {
        for (const key of ['detail', 'message', 'error', 'msg', 'title']) {
            const message = extractErrorMessage(payload[key]);
            if (message) {
                return message;
            }
        }

        if (payload.errors) {
            const message = extractErrorMessage(payload.errors);
            if (message) {
                return message;
            }
        }

        const nestedMessages = Object.values(payload)
            .map((item) => extractErrorMessage(item))
            .filter(Boolean);

        if (nestedMessages.length) {
            return nestedMessages.join(' ');
        }

        try {
            return JSON.stringify(payload);
        } catch {
            return null;
        }
    }

    return null;
};

const handleResponse = async (response) => {
    if (!response.ok) {
        const error = await parseResponseBody(response).catch(() => ({}));
        const message = extractErrorMessage(error);
        throw new Error(message || `HTTP ${response.status}: Request failed`);
    }
    return parseResponseBody(response);
};

// Auth-aware fetch wrapper: retries once after refresh when 401 occurs.
const authFetch = async (path, options = {}) => {
    const url = buildUrl(path);
    const mergedOptions = {
        ...options,
        headers: {
            ...(options.headers || {}),
        },
    };

    // Ensure Authorization header is set from current token
    if (authToken) mergedOptions.headers.Authorization = `Bearer ${authToken}`;

    let resp = await fetch(url, mergedOptions);

    if (resp.status === 401) {
        // Keep re-login behavior: clear stored tokens and surface unauthorized error
        try {
            clearAuthTokens();
        } catch (e) {
            // ignore
        }
        const errorBody = await parseResponseBody(resp).catch(() => null);
        const message = extractErrorMessage(errorBody);
        throw new Error(message || 'Unauthorized');
    }

    return handleResponse(resp);
};

// Internal refresh helper
const _refreshAuthToken = async () => {
    if (!refreshToken) throw new Error('No refresh token available');
    try {
        const resp = await fetch(buildUrl('/api/v1/auth/refresh'), {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ refresh_token: refreshToken }),
        });
        const data = await handleResponse(resp);
        if (data?.access_token) {
            setAuthToken(data.access_token);
            if (data.refresh_token) setRefreshToken(data.refresh_token);

            // Persist refreshed tokens to local DB if a user record exists
            try {
                const localUser = await getUser();
                if (localUser) {
                    await saveUser({
                        id: localUser.server_id || localUser.id,
                        email: localUser.email,
                        fullName: localUser.full_name,
                        role: localUser.role,
                        token: data.access_token,
                        refreshToken: data.refresh_token || null,
                        profile: JSON.parse(localUser.profile_data || '{}'),
                    });
                }
            } catch (e) {
                // ignore persistence errors
            }
        }
        return data;
    } catch (error) {
        // Clear tokens on refresh failure
        setAuthToken(null);
        setRefreshToken(null);
        throw error;
    }
};

// ── Auth Endpoints ─────────────────────────────────────────────

export const loginUser = async (email, password) => {
    try {
        const body = new URLSearchParams();
        body.append('username', email);
        body.append('password', password);

        const response = await fetch(buildUrl('/api/v1/auth/login'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
        });
        return await handleResponse(response);
    } catch (error) {
        console.warn('[API] Login failed:', error.message);
        throw error;
    }
};

// ── Fetch-and-Sync Pattern: Get fresh user data from backend ──

/**
 * Fetch complete user profile and all related data from backend.
 * This is the 'Source of Truth' that should be called on login.
 * Returns all user data in a single structured response.
 */
export const fetchCompleteUserProfile = async () => {
    try {
        console.log('[Fetch-and-Sync] Fetching complete user profile from backend...');

        // Fetch user profile
        const profile = await fetchProfile();
        
        // Fetch user's questionnaire responses
        let questionnaire = null;
        try {
            questionnaire = await authFetch('/api/v1/user/questionnaire');
        } catch (e) {
            console.warn('[Fetch-and-Sync] Failed to fetch questionnaire:', e.message);
            throw e;
        }

        // Fetch user's scan history
        let scanHistory = [];
        try {
            scanHistory = await authFetch('/api/v1/user/scans');
        } catch (e) {
            console.warn('[Fetch-and-Sync] Failed to fetch scan history:', e.message);
            throw e;
        }

        // Fetch user's recommendations
        let recommendations = [];
        try {
            recommendations = await authFetch('/api/v1/user/recommendations');
        } catch (e) {
            console.warn('[Fetch-and-Sync] Failed to fetch recommendations:', e.message);
            throw e;
        }

        const completeProfile = {
            user: profile,
            questionnaire,
            scanHistory,
            recommendations,
            fetchedAt: new Date().toISOString(),
        };

        console.log('[Fetch-and-Sync] Complete profile fetched successfully');
        return completeProfile;
    } catch (error) {
        console.error('[Fetch-and-Sync] Failed to fetch complete profile:', error);
        throw error;
    }
};

export const registerUser = async (userData) => {
    try {
        const response = await fetch(buildUrl('/api/v1/auth/register'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        });
        return await handleResponse(response);
    } catch (error) {
        console.warn('[API] Registration failed:', error.message);
        throw error;
    }
};

export const requestPasswordReset = async (email) => {
    try {
        const response = await fetch(buildUrl('/api/v1/auth/forgot-password'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: email.trim(),
            }),
        });
        return await handleResponse(response);
    } catch (error) {
        console.warn('[API] Password reset request failed:', error.message);
        throw error;
    }
};

export const resetPassword = async (token, newPassword) => {
    try {
        const response = await fetch(buildUrl('/api/v1/auth/reset-password'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                token,
                new_password: newPassword,
            }),
        });
        return await handleResponse(response);
    } catch (error) {
        console.warn('[API] Password reset failed:', error.message);
        throw error;
    }
};

// ── Diagnostic Endpoints ───────────────────────────────────────

export const submitXrayForAnalysis = async (imageUri, kneeSide, viewType = 'PA') => {
    try {
        const uploadPayload = {
            image_uri: imageUri,
            knee_side: kneeSide,
            view_type: viewType,
        };

        return await authFetch('/api/v1/diagnostic/analyze', {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(uploadPayload),
        });
    } catch (error) {
        console.warn('[API] X-ray analysis failed:', error.message);
        throw error;
    }
};

export const uploadXrayImage = async (imageUri) => {
    try {
        const formData = new FormData();
        formData.append('file', {
            uri: imageUri,
            name: imageUri.split('/').pop() || 'xray.jpg',
            type: 'image/jpeg',
        });

        const response = await fetch(buildUrl('/api/v1/upload/'), {
            method: 'POST',
            headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
            body: formData,
        });

        return await handleResponse(response);
    } catch (error) {
        console.warn('[API] X-ray upload failed:', error.message);
        throw error;
    }
};

export const analyzeUploadedXray = async (imageId, painLevel = null, mobilityLevel = null) => {
    try {
        const payload = { image_id: imageId };

        if (painLevel !== null && painLevel !== undefined) {
            payload.pain_level = painLevel;
        }

        if (mobilityLevel) {
            payload.mobility_level = mobilityLevel;
        }

        return await authFetch('/api/v1/diagnostic/analyze', {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload),
        });
    } catch (error) {
        console.warn('[API] Uploaded X-ray analysis failed:', error.message);
        throw error;
    }
};

export const getAnalysisResult = async (analysisId) => {
    try {
        return await authFetch(`/api/v1/diagnostic/reports/${analysisId}`);
    } catch (error) {
        console.warn('[API] Get result failed:', error.message);
        throw error;
    }
};

// ── Questionnaire Endpoints ────────────────────────────────────

export const submitQuestionnaireToServer = async (questionnaireData) => {
    try {
        return await authFetch('/api/v1/mobile/sync/export', {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(questionnaireData),
        });
    } catch (error) {
        console.warn('[API] Questionnaire submit failed:', error.message);
        throw error;
    }
};

// ── Recommendations (RAG) Endpoints ────────────────────────────

export const fetchRecommendations = async (klGrade, painLevel = null, mobilityLevel = null) => {
    try {
        const params = new URLSearchParams();
        params.append('kl_grade', String(klGrade ?? 0));
        if (painLevel !== null && painLevel !== undefined) {
            params.append('pain_level', String(painLevel));
        }
        if (mobilityLevel) {
            params.append('mobility_level', mobilityLevel);
        }

        return await authFetch(`/api/v1/recommendation/?${params.toString()}`);
    } catch (error) {
        console.warn('[API] Recommendations fetch failed:', error.message);
        throw error;
    }
};

export const fetchReports = async () => {
    try {
        return await authFetch('/api/v1/diagnostic/reports');
    } catch (error) {
        console.warn('[API] Reports fetch failed:', error.message);
        throw error;
    }
};

export const fetchProfile = async () => {
    try {
        return await authFetch('/api/v1/profile/me');
    } catch (error) {
        console.warn('[API] Profile fetch failed:', error.message);
        throw error;
    }
};

export const fetchProfileHistory = async () => {
    try {
        return await authFetch('/api/v1/profile/me/history');
    } catch (error) {
        console.warn('[API] Profile history fetch failed:', error.message);
        throw error;
    }
};

export const fetchPatientHistory = async (patientId) => {
    try {
        if (!patientId) throw new Error('patientId required');
        // Ensure numeric id when possible (backend expects integer path param)
        const numericId = Number(patientId);
        const pathId = Number.isFinite(numericId) && !Number.isNaN(numericId) ? String(Math.floor(numericId)) : String(patientId);
        return await authFetch(`/api/v1/profile/patients/${pathId}/history`);
    } catch (error) {
        console.warn('[API] Patient history fetch failed:', error.message);
        throw error;
    }
};

export const updateProfile = async (profileData) => {
    try {
        return await authFetch('/api/v1/profile/me', {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(profileData),
        });
    } catch (error) {
        console.warn('[API] Profile update failed:', error.message);
        throw error;
    }
};

export const fetchVideoLibrary = async (klGrade = null, category = null) => {
    try {
        const params = new URLSearchParams();
        if (klGrade !== null && klGrade !== undefined) {
            params.append('kl_grade', String(klGrade));
        }
        if (category) {
            params.append('category', category);
        }

        const queryString = params.toString();
        return await authFetch(`/api/v1/videos/${queryString ? `?${queryString}` : ''}`);
    } catch (error) {
        console.warn('[API] Video library fetch failed:', error.message);
        throw error;
    }
};

// ── Sync Endpoints ─────────────────────────────────────────────

export const syncDataToCloud = async (syncPayload) => {
    try {
        return await authFetch('/api/v1/mobile/sync/export', {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(syncPayload),
        });
    } catch (error) {
        console.warn('[API] Sync failed:', error.message);
        throw error;
    }
};

export const fetchLatestFromCloud = async (lastSyncTimestamp) => {
    try {
        return await authFetch('/api/v1/mobile/sync/data');
    } catch (error) {
        console.warn('[API] Cloud fetch failed:', error.message);
        throw error;
    }
};

// ── Network Check ──────────────────────────────────────────────

export const isOnline = async () => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        await fetch(buildUrl('/health'), { signal: controller.signal });
        clearTimeout(timeout);
        return true;
    } catch {
        return false;
    }
};
