// ─── Backend API Service ───────────────────────────────────────
// Communicates with the FastAPI Diagnostic Agent backend.
// All requests include auth tokens and handle network errors
// gracefully for offline-first resilience.

const BASE_URL = 'https://api.kneeoa.example.com/v1'; // Replace with actual endpoint

let authToken = null;

export const setAuthToken = (token) => {
    authToken = token;
};

const getHeaders = () => ({
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
});

const handleResponse = async (response) => {
    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || `HTTP ${response.status}: Request failed`);
    }
    return response.json();
};

// ── Auth Endpoints ─────────────────────────────────────────────

export const loginUser = async (email, password) => {
    try {
        const response = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        return await handleResponse(response);
    } catch (error) {
        console.warn('[API] Login failed:', error.message);
        throw error;
    }
};

export const registerUser = async (userData) => {
    try {
        const response = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
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
        const formData = new FormData();
        formData.append('image', {
            uri: imageUri,
            type: 'image/jpeg',
            name: 'xray.jpg',
        });
        formData.append('knee_side', kneeSide);
        formData.append('view_type', viewType);

        const response = await fetch(`${BASE_URL}/diagnostic/analyze`, {
            method: 'POST',
            headers: {
                ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
            },
            body: formData,
        });
        return await handleResponse(response);
    } catch (error) {
        console.warn('[API] X-ray analysis failed:', error.message);
        throw error;
    }
};

export const getAnalysisResult = async (analysisId) => {
    try {
        const response = await fetch(`${BASE_URL}/diagnostic/result/${analysisId}`, {
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
        const response = await fetch(`${BASE_URL}/questionnaire/submit`, {
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

export const fetchRecommendations = async (scanId, questionnaireId) => {
    try {
        const response = await fetch(`${BASE_URL}/recommendations/generate`, {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({ scan_id: scanId, questionnaire_id: questionnaireId }),
        });
        return await handleResponse(response);
    } catch (error) {
        console.warn('[API] Recommendations fetch failed:', error.message);
        throw error;
    }
};

// ── Sync Endpoints ─────────────────────────────────────────────

export const syncDataToCloud = async (syncPayload) => {
    try {
        const response = await fetch(`${BASE_URL}/sync/upload`, {
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
        const response = await fetch(
            `${BASE_URL}/sync/download?since=${encodeURIComponent(lastSyncTimestamp)}`,
            { headers: getHeaders() }
        );
        return await handleResponse(response);
    } catch (error) {
        console.warn('[API] Cloud fetch failed:', error.message);
        throw error;
    }
};

// ── Video Library Endpoint ─────────────────────────────────────

export const fetchVideoLibrary = async () => {
    try {
        const response = await fetch(`${BASE_URL}/videos/library`, {
            headers: getHeaders(),
        });
        return await handleResponse(response);
    } catch (error) {
        console.warn('[API] Video library fetch failed:', error.message);
        throw error;
    }
};

// ── Network Check ──────────────────────────────────────────────

export const isOnline = async () => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        await fetch(`${BASE_URL}/health`, { signal: controller.signal });
        clearTimeout(timeout);
        return true;
    } catch {
        return false;
    }
};
