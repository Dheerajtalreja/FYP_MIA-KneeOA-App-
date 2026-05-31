// ─── Backend API Service ───────────────────────────────────────
// Communicates with the backend API and keeps the base URL
// configurable through Expo environment variables.

const DEFAULT_BASE_URL = 'http://localhost:8000';

const getBackendBaseUrl = () =>
    (process.env.EXPO_PUBLIC_BACKEND_URL || DEFAULT_BASE_URL).replace(/\/+$/, '');

const buildUrl = (path) => `${getBackendBaseUrl()}${path.startsWith('/') ? path : `/${path}`}`;

let authToken = null;

export const setAuthToken = (token) => {
    authToken = token;
};

export const getBackendUrl = () => getBackendBaseUrl();

const getHeaders = () => ({
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
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

const handleResponse = async (response) => {
    if (!response.ok) {
        const error = await parseResponseBody(response).catch(() => ({}));
        const message = typeof error === 'string' ? error : error.detail || error.message;
        throw new Error(message || `HTTP ${response.status}: Request failed`);
    }
    return parseResponseBody(response);
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

export const registerUser = async (userData) => {
    try {
        const response = await fetch(buildUrl('/api/v1/auth/register'), {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(userData),
        });
        return await handleResponse(response);
    } catch (error) {
        console.warn('[API] Registration failed:', error.message);
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

        const response = await fetch(buildUrl('/api/v1/diagnostic/analyze'), {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(uploadPayload),
        });
        return await handleResponse(response);
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

        const response = await fetch(buildUrl('/api/v1/diagnostic/analyze'), {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(payload),
        });

        return await handleResponse(response);
    } catch (error) {
        console.warn('[API] Uploaded X-ray analysis failed:', error.message);
        throw error;
    }
};

export const getAnalysisResult = async (analysisId) => {
    try {
        const response = await fetch(buildUrl(`/api/v1/diagnostic/reports/${analysisId}`), {
            headers: getHeaders(),
        });
        return await handleResponse(response);
    } catch (error) {
        console.warn('[API] Get result failed:', error.message);
        throw error;
    }
};

// ── Questionnaire Endpoints ────────────────────────────────────

export const submitQuestionnaireToServer = async (questionnaireData) => {
    try {
        const response = await fetch(buildUrl('/api/v1/mobile/sync/export'), {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(questionnaireData),
        });
        return await handleResponse(response);
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

        const response = await fetch(buildUrl(`/api/v1/recommendation/?${params.toString()}`), {
            headers: getHeaders(),
        });
        return await handleResponse(response);
    } catch (error) {
        console.warn('[API] Recommendations fetch failed:', error.message);
        throw error;
    }
};

export const fetchReports = async () => {
    try {
        const response = await fetch(buildUrl('/api/v1/diagnostic/reports'), {
            headers: getHeaders(),
        });
        return await handleResponse(response);
    } catch (error) {
        console.warn('[API] Reports fetch failed:', error.message);
        throw error;
    }
};

export const fetchProfile = async () => {
    try {
        const response = await fetch(buildUrl('/api/v1/profile/me'), {
            headers: getHeaders(),
        });
        return await handleResponse(response);
    } catch (error) {
        console.warn('[API] Profile fetch failed:', error.message);
        throw error;
    }
};

export const fetchProfileHistory = async () => {
    try {
        const response = await fetch(buildUrl('/api/v1/profile/me/history'), {
            headers: getHeaders(),
        });
        return await handleResponse(response);
    } catch (error) {
        console.warn('[API] Profile history fetch failed:', error.message);
        throw error;
    }
};

export const updateProfile = async (profileData) => {
    try {
        const response = await fetch(buildUrl('/api/v1/profile/me'), {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify(profileData),
        });
        return await handleResponse(response);
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
        const response = await fetch(
            buildUrl(`/api/v1/videos/${queryString ? `?${queryString}` : ''}`),
            {
                headers: getHeaders(),
            }
        );
        return await handleResponse(response);
    } catch (error) {
        console.warn('[API] Video library fetch failed:', error.message);
        throw error;
    }
};

// ── Sync Endpoints ─────────────────────────────────────────────

export const syncDataToCloud = async (syncPayload) => {
    try {
        const response = await fetch(buildUrl('/api/v1/mobile/sync/export'), {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify(syncPayload),
        });
        return await handleResponse(response);
    } catch (error) {
        console.warn('[API] Sync failed:', error.message);
        throw error;
    }
};

export const fetchLatestFromCloud = async (lastSyncTimestamp) => {
    try {
        const response = await fetch(buildUrl('/api/v1/mobile/sync/data'), {
            headers: getHeaders(),
        });
        return await handleResponse(response);
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
