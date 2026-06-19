import { API_BASE_URL, API_ENVIRONMENT, buildApiUrl, isSecureApiBaseUrl } from '../config/apiConfig';
import { getUser, saveUser } from './database';
import { clearStoredAuthState, loadStoredAuthState, persistStoredAuthState } from './tokenStore';

let authToken = null;
let refreshToken = null;
let authStateLoaded = false;
let authStateLoadingPromise = null;
let sessionExpiredHandler = null;

export class ApiError extends Error {
    constructor(message, { status = null, code = null, details = null, fieldErrors = null, raw = null } = {}) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.details = details;
        this.fieldErrors = fieldErrors;
        this.raw = raw;
    }
}

export class UnauthorizedError extends ApiError {
    constructor(message = 'Your session expired. Please sign in again.', options = {}) {
        super(message, { ...options, status: 401, code: 'unauthorized' });
        this.name = 'UnauthorizedError';
    }
}

export class ForbiddenError extends ApiError {
    constructor(message = 'You do not have access to this resource.', options = {}) {
        super(message, { ...options, status: 403, code: 'forbidden' });
        this.name = 'ForbiddenError';
    }
}

export class NotFoundError extends ApiError {
    constructor(message = 'Requested resource was not found.', options = {}) {
        super(message, { ...options, status: 404, code: 'not_found' });
        this.name = 'NotFoundError';
    }
}

export class ValidationError extends ApiError {
    constructor(message = 'Please review the highlighted fields.', options = {}) {
        super(message, { ...options, status: 422, code: 'validation_error' });
        this.name = 'ValidationError';
    }
}

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const normalizePath = (path) => (path.startsWith('/') ? path : `/${path}`);

const getDefaultHeaders = () => ({
    Accept: 'application/json',
});

const ensureAuthStateLoaded = async () => {
    if (authStateLoaded) {
        return { accessToken: authToken, refreshToken };
    }

    if (!authStateLoadingPromise) {
        authStateLoadingPromise = (async () => {
            try {
                // Defensive: Ensure loadStoredAuthState is available
                if (typeof loadStoredAuthState !== 'function') {
                    throw new Error('loadStoredAuthState is not a function');
                }

                const stored = await loadStoredAuthState();
                authToken = stored.accessToken || null;
                refreshToken = stored.refreshToken || null;
                authStateLoaded = true;
                return { accessToken: authToken, refreshToken };
            } catch (error) {
                console.error('[apiCore] Failed to load auth state:', error);
                // Return safe defaults instead of throwing
                authToken = null;
                refreshToken = null;
                authStateLoaded = true;
                return { accessToken: null, refreshToken: null };
            } finally {
                authStateLoadingPromise = null;
            }
        })();
    }

    return authStateLoadingPromise;
};

const persistAuthState = async () => {
    if (!authToken && !refreshToken) {
        await clearStoredAuthState();
        return;
    }

    await persistStoredAuthState({ accessToken: authToken, refreshToken });
};

export const hydrateAuthState = async () => ensureAuthStateLoaded();

export const getBackendUrl = () => API_BASE_URL;

export const getApiEnvironment = () => API_ENVIRONMENT;

export const isBackendUrlSecure = () => isSecureApiBaseUrl();

export const setSessionExpiredHandler = (handler) => {
    sessionExpiredHandler = typeof handler === 'function' ? handler : null;
};

export const setAuthToken = (token) => {
    authToken = token || null;
    void persistAuthState();
};

export const setRefreshToken = (token) => {
    refreshToken = token || null;
    void persistAuthState();
};

export const clearAuthTokens = () => {
    authToken = null;
    refreshToken = null;
    void clearStoredAuthState();
};

export const getAccessToken = async () => {
    await ensureAuthStateLoaded();
    return authToken;
};

const parseResponseBody = async (response) => {
    if (response.status === 204) {
        return null;
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
        return response.json();
    }

    const text = await response.text();
    return text.length > 0 ? text : null;
};

const fieldPathFromLocation = (location = []) =>
    location
        .filter((part) => typeof part === 'string' && !['body', 'query', 'path', 'header'].includes(part))
        .join('.') || 'detail';

const buildFieldErrors = (detail = []) => {
    const fieldErrors = {};

    detail.forEach((entry) => {
        if (!entry) return;
        const fieldName = fieldPathFromLocation(entry.loc || []);
        fieldErrors[fieldName] = entry.msg || 'Invalid value.';
    });

    return fieldErrors;
};

const genericMessageForStatus = (status) => {
    switch (status) {
        case 401:
            return 'Your session expired. Please sign in again.';
        case 403:
            return 'You do not have access to this resource.';
        case 404:
            return 'Requested resource was not found.';
        case 422:
            return 'Please review the highlighted fields.';
        default:
            if (status >= 500) {
                return 'The server could not complete the request.';
            }
            return 'The request could not be completed.';
    }
};

const mapErrorResponse = async (response) => {
    const payload = await parseResponseBody(response).catch(() => null);

    if (response.status === 401) {
        clearAuthTokens();
        const error = new UnauthorizedError(null, { status: 401 });
        if (sessionExpiredHandler) {
            sessionExpiredHandler(error);
        }
        return error;
    }

    if (response.status === 403) {
        return new ForbiddenError(null, { status: 403 });
    }

    if (response.status === 404) {
        return new NotFoundError(null, { status: 404 });
    }

    if (response.status === 422) {
        const detail = Array.isArray(payload?.detail) ? payload.detail : [];
        return new ValidationError(genericMessageForStatus(422), {
            status: 422,
            details: detail,
            fieldErrors: buildFieldErrors(detail),
            raw: payload,
        });
    }

    const details = payload && typeof payload === 'object' ? payload : null;
    return new ApiError(genericMessageForStatus(response.status), {
        status: response.status,
        details,
        raw: payload,
    });
};

const applyHeaders = (headers = {}, body = null) => {
    const nextHeaders = new Headers(getDefaultHeaders());

    Object.entries(headers).forEach(([key, value]) => {
        if (value === undefined || value === null) {
            return;
        }
        nextHeaders.set(key, value);
    });

    if (body && !(body instanceof FormData) && !nextHeaders.has('Content-Type')) {
        nextHeaders.set('Content-Type', 'application/json');
    }

    return nextHeaders;
};

let isRefreshing = false;
let refreshSubscribers = [];

const subscribeTokenRefresh = (cb) => {
    refreshSubscribers.push(cb);
};

const onRefreshed = (token) => {
    refreshSubscribers.map(cb => cb(token));
    refreshSubscribers = [];
};

const handleResponse = async (response, originalOptions) => {
    if (!response.ok) {
        if (response.status === 401 && !originalOptions._retry) {
            if (isRefreshing) {
                return new Promise(resolve => {
                    subscribeTokenRefresh(token => {
                        const nextHeaders = new Headers(originalOptions.headers);
                        nextHeaders.set('Authorization', `Bearer ${token}`);
                        resolve(fetch(originalOptions.url, { ...originalOptions, headers: nextHeaders }));
                    });
                }).then(res => handleResponse(res, originalOptions));
            }

            originalOptions._retry = true;
            isRefreshing = true;

            try {
                const data = await refreshAuthToken();
                const newToken = data?.access_token;
                isRefreshing = false;
                if (newToken) {
                    onRefreshed(newToken);
                    const nextHeaders = new Headers(originalOptions.headers);
                    nextHeaders.set('Authorization', `Bearer ${newToken}`);
                    return handleResponse(await fetch(originalOptions.url, { ...originalOptions, headers: nextHeaders }), originalOptions);
                }
            } catch (refreshError) {
                isRefreshing = false;
                throw await mapErrorResponse(response);
            }
        }
        throw await mapErrorResponse(response);
    }

    return parseResponseBody(response);
};

/**
 * Enhanced error message extractor for robust error reporting
 */
const extractErrorMessage = (payload) => {
    if (payload === null || payload === undefined) return null;
    if (typeof payload === 'string') return payload.trim() || null;
    if (typeof payload === 'number' || typeof payload === 'boolean') return String(payload);

    if (Array.isArray(payload)) {
        const messages = payload.map(item => extractErrorMessage(item)).filter(Boolean);
        return messages.length ? messages.join(' ') : null;
    }

    if (typeof payload === 'object') {
        // Try common field names for errors
        for (const key of ['detail', 'message', 'error', 'msg', 'title']) {
            const message = extractErrorMessage(payload[key]);
            if (message) return message;
        }

        // Try validation errors
        if (payload.errors) {
            const message = extractErrorMessage(payload.errors);
            if (message) return message;
        }

        // Try values of the object
        const nestedMessages = Object.values(payload)
            .map(item => extractErrorMessage(item))
            .filter(Boolean);

        if (nestedMessages.length) return nestedMessages.join(' ');

        try {
            return JSON.stringify(payload);
        } catch {
            return 'An unexpected error occurred.';
        }
    }

    return null;
};

const request = async (path, options = {}, { auth = false, timeout = 15000 } = {}) => {
    await ensureAuthStateLoaded();

    const nextHeaders = applyHeaders(options.headers || {}, options.body ?? null);

    if (auth && authToken) {
        nextHeaders.set('Authorization', `Bearer ${authToken}`);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const url = buildApiUrl(normalizePath(path));
        const response = await fetch(url, {
            ...options,
            headers: nextHeaders,
            signal: controller.signal,
        });

        return await handleResponse(response, { ...options, headers: nextHeaders, url });
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new ApiError('Request timed out. Please check your internet connection.', { status: 408, code: 'timeout' });
        }
        throw error;
    } finally {
        clearTimeout(timeoutId);
    }
};

const validateRequiredString = (value, fieldName) => {
    if (!isNonEmptyString(value)) {
        throw new ValidationError(`${fieldName} is required.`, {
            fieldErrors: { [fieldName]: `${fieldName} is required.` },
        });
    }
};

const validateIntegerRange = (value, fieldName, min, max) => {
    if (value === null || value === undefined) return;
    const numericValue = Number(value);
    if (!Number.isInteger(numericValue) || numericValue < min || numericValue > max) {
        throw new ValidationError(`${fieldName} must be between ${min} and ${max}.`, {
            fieldErrors: { [fieldName]: `${fieldName} must be between ${min} and ${max}.` },
        });
    }
};

const normalizeBoolean = (value) => {
    if (value === null || value === undefined) return null;
    return Boolean(value);
};

const normalizeStringArray = (value, fieldName) => {
    if (value === null || value === undefined) {
        return undefined;
    }

    if (!Array.isArray(value)) {
        throw new ValidationError(`${fieldName} must be an array.`, {
            fieldErrors: { [fieldName]: `${fieldName} must be an array.` },
        });
    }

    return value.filter((item) => isNonEmptyString(item)).map((item) => item.trim());
};

const buildUserCreatePayload = (userData = {}) => {
    validateRequiredString(userData.email, 'email');
    validateRequiredString(userData.password, 'password');
    validateRequiredString(userData.full_name, 'full_name');
    validateIntegerRange(userData.age, 'age', 1, 120);
    validateIntegerRange(userData.pain_level, 'pain_level', 0, 10);

    const payload = {
        email: String(userData.email).trim().toLowerCase(),
        password: String(userData.password),
        full_name: String(userData.full_name).trim(),
        role: isNonEmptyString(userData.role) ? String(userData.role).trim() : 'patient',
    };

    if (userData.age !== undefined && userData.age !== null) {
        payload.age = Number(userData.age);
    }

    if (userData.pain_level !== undefined && userData.pain_level !== null) {
        payload.pain_level = Number(userData.pain_level);
    }

    if (userData.mobility_level !== undefined && userData.mobility_level !== null && isNonEmptyString(userData.mobility_level)) {
        payload.mobility_level = String(userData.mobility_level).trim();
    }

    if (userData.has_support !== undefined && userData.has_support !== null) {
        payload.has_support = normalizeBoolean(userData.has_support);
    }

    return payload;
};

const buildProfileUpdatePayload = (profileData = {}) => {
    const payload = {};

    if (profileData.full_name !== undefined && profileData.full_name !== null) {
        payload.full_name = String(profileData.full_name).trim();
    }

    if (profileData.email !== undefined && profileData.email !== null) {
        payload.email = String(profileData.email).trim().toLowerCase();
    }

    if (profileData.age !== undefined && profileData.age !== null) {
        validateIntegerRange(profileData.age, 'age', 1, 120);
        payload.age = Number(profileData.age);
    }

    if (profileData.pain_level !== undefined && profileData.pain_level !== null) {
        validateIntegerRange(profileData.pain_level, 'pain_level', 0, 10);
        payload.pain_level = Number(profileData.pain_level);
    }

    if (profileData.mobility_level !== undefined && profileData.mobility_level !== null) {
        payload.mobility_level = String(profileData.mobility_level).trim();
    }

    if (profileData.kinesiophobia !== undefined && profileData.kinesiophobia !== null) {
        payload.kinesiophobia = String(profileData.kinesiophobia).trim();
    }

    if (profileData.occupation_type !== undefined && profileData.occupation_type !== null) {
        payload.occupation_type = String(profileData.occupation_type).trim();
    }

    if (profileData.has_stairs !== undefined && profileData.has_stairs !== null) {
        payload.has_stairs = normalizeBoolean(profileData.has_stairs);
    }

    if (profileData.current_meds !== undefined && profileData.current_meds !== null) {
        payload.current_meds = normalizeStringArray(profileData.current_meds, 'current_meds');
    }

    if (profileData.sleep_quality !== undefined && profileData.sleep_quality !== null) {
        payload.sleep_quality = String(profileData.sleep_quality).trim();
    }

    return payload;
};

const buildMultipartFile = (imageUri) => {
    const fileName = String(imageUri).split('/').pop() || 'xray.jpg';
    const extension = fileName.split('.').pop()?.toLowerCase();
    const mimeType = extension === 'png' ? 'image/png' : 'image/jpeg';

    return {
        uri: imageUri,
        name: fileName,
        type: mimeType,
    };
};

export const loginUser = async (email, password, grantType = 'password') => {
    validateRequiredString(email, 'username');
    validateRequiredString(password, 'password');

    const formData = new URLSearchParams();
    formData.append('username', String(email).trim().toLowerCase());
    formData.append('password', String(password));
    if (isNonEmptyString(grantType)) {
        formData.append('grant_type', String(grantType));
    }

    return request('/api/v1/auth/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
    });
};

export const requestPasswordReset = async (email) => {
    validateRequiredString(email, 'email');
    return request('/api/v1/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
    });
};

export const resetPassword = async (token, newPassword) => {
    validateRequiredString(token, 'token');
    validateRequiredString(newPassword, 'new_password');
    return request('/api/v1/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, new_password: newPassword }),
    });
};

export const registerUser = async (userData) => {
    const payload = buildUserCreatePayload(userData);
    const response = await request('/api/v1/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
    });

    if (response?.user_id) {
        try {
            await saveUser({
                id: response.user_id,
                email: response.email,
                fullName: response.full_name,
                role: response.role,
                profile: response,
            });
        } catch {
            // Local cache best effort.
        }
    }

    return response;
};

export const uploadXrayImage = async (imageUri) => {
    validateRequiredString(imageUri, 'file');

    const formData = new FormData();
    formData.append('file', buildMultipartFile(imageUri));

    return request('/api/v1/upload/', {
        method: 'POST',
        body: formData,
    }, {
        auth: true,
    });
};

export const analyzeUploadedXray = async (imageId, painLevel = null, mobilityLevel = null) => {
    if (imageId === null || imageId === undefined || Number.isNaN(Number(imageId))) {
        throw new ValidationError('image_id is required.', {
            fieldErrors: { image_id: 'image_id is required.' },
        });
    }

    const payload = {
        image_id: Number(imageId),
    };

    if (painLevel !== null && painLevel !== undefined) {
        validateIntegerRange(painLevel, 'pain_level', 0, 10);
        payload.pain_level = Number(painLevel);
    }

    if (mobilityLevel !== null && mobilityLevel !== undefined && isNonEmptyString(mobilityLevel)) {
        payload.mobility_level = String(mobilityLevel).trim();
    }

    return request('/api/v1/diagnostic/analyze', {
        method: 'POST',
        body: JSON.stringify(payload),
    }, {
        auth: true,
    });
};

export const submitXrayForAnalysis = async (imageUri, kneeSide, viewType = 'PA') => {
    void kneeSide;
    void viewType;
    const uploaded = await uploadXrayImage(imageUri);
    return analyzeUploadedXray(uploaded?.image_id);
};

export const getAnalysisResult = async (analysisId) => {
    if (analysisId === null || analysisId === undefined) {
        throw new ValidationError('report_id is required.', {
            fieldErrors: { report_id: 'report_id is required.' },
        });
    }

    return request(`/api/v1/diagnostic/reports/${analysisId}`, {}, { auth: true });
};

export const submitQuestionnaireToServer = async (questionnaireData) => syncDataToCloud(questionnaireData);

export const fetchRecommendations = async (klGrade, painLevel = null, mobilityLevel = null) => {
    if (klGrade === null || klGrade === undefined || Number.isNaN(Number(klGrade))) {
        throw new ValidationError('kl_grade is required.', {
            fieldErrors: { kl_grade: 'kl_grade is required.' },
        });
    }

    const params = new URLSearchParams();
    params.append('kl_grade', String(Number(klGrade)));

    if (painLevel !== null && painLevel !== undefined) {
        validateIntegerRange(painLevel, 'pain_level', 0, 10);
        params.append('pain_level', String(Number(painLevel)));
    }

    if (mobilityLevel !== null && mobilityLevel !== undefined && isNonEmptyString(mobilityLevel)) {
        params.append('mobility_level', String(mobilityLevel).trim());
    }

    return request(`/api/v1/recommendation/?${params.toString()}`, {}, { auth: true });
};

export const fetchReports = async () => request('/api/v1/diagnostic/reports', {}, { auth: true });

export const fetchProfile = async () => {
    const profile = await request('/api/v1/profile/me', {}, { auth: true });

    if (profile?.user_id || profile?.email) {
        try {
            const localUser = await getUser();
            if (localUser) {
                await saveUser({
                    id: profile.user_id || localUser.server_id || localUser.id,
                    email: profile.email || localUser.email,
                    fullName: profile.full_name || localUser.full_name,
                    role: profile.role || localUser.role || 'patient',
                    profile,
                });
            }
        } catch {
            // Local cache best effort.
        }
    }

    return profile;
};

export const fetchProfileHistory = async () => request('/api/v1/profile/me/history', {}, { auth: true });

export const fetchPatientHistory = async (patientId) => {
    if (!patientId) {
        throw new ValidationError('patientId is required.', {
            fieldErrors: { patientId: 'patientId is required.' },
        });
    }

    const numericId = Number(patientId);
    const pathId = Number.isFinite(numericId) && !Number.isNaN(numericId) ? String(Math.floor(numericId)) : String(patientId);
    return request(`/api/v1/profile/patients/${pathId}/history`, {}, { auth: true });
};

export const updateProfile = async (profileData) => {
    const payload = buildProfileUpdatePayload(profileData);
    return request('/api/v1/profile/me', {
        method: 'PUT',
        body: JSON.stringify(payload),
    }, {
        auth: true,
    });
};

export const fetchVideoLibrary = async (klGrade = null, category = null) => {
    const params = new URLSearchParams();

    if (klGrade !== null && klGrade !== undefined) {
        params.append('kl_grade', String(Number(klGrade)));
    }

    if (isNonEmptyString(category)) {
        params.append('category', String(category).trim());
    }

    const query = params.toString();
    return request(`/api/v1/videos/${query ? `?${query}` : ''}`, {}, { auth: true });
};

export const syncDataToCloud = async (syncPayload) => request('/api/v1/mobile/sync/export', {
    method: 'POST',
    body: JSON.stringify(syncPayload || {}),
}, {
    auth: true,
});

export const fetchLatestFromCloud = async () => request('/api/v1/mobile/sync/data', {}, { auth: true });

export const fetchSyncSummary = async () => request('/api/v1/mobile/sync/summary', {}, { auth: true });

export const fetchSyncStatus = async () => request('/api/v1/mobile/sync/status', {}, { auth: true });

/**
 * Internal helper to refresh the access token using a refresh token.
 */
export const refreshAuthToken = async () => {
    if (!refreshToken) throw new UnauthorizedError('No refresh token available.');

    try {
        const data = await request('/api/v1/auth/refresh', {
            method: 'POST',
            body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (data?.access_token) {
            setAuthToken(data.access_token);
            if (data.refresh_token) setRefreshToken(data.refresh_token);
            return data;
        }
        throw new UnauthorizedError('Refresh failed: No access token received.');
    } catch (error) {
        clearAuthTokens();
        throw error;
    }
};

/**
 * Fetch-and-Sync Pattern: Get fresh user data from backend.
 * This is the 'Source of Truth' that should be called on login.
 */
export const fetchCompleteUserProfile = async () => {
    try {
        console.log('[Fetch-and-Sync] Fetching complete user profile from backend...');

        // Fetch user profile
        const profile = await fetchProfile();

        // Fetch related data in parallel with safe error handling (404 is okay for new users)
        const [questionnaireResult, scansResult, recommendationsResult] = await Promise.allSettled([
            authFetch('/api/v1/user/questionnaire'),
            authFetch('/api/v1/user/scans'),
            authFetch('/api/v1/user/recommendations')
        ]);

        const getResultValue = (result, defaultValue) => {
            if (result.status === 'fulfilled') return result.value;
            // 404 means no data yet, which is normal for new accounts
            if (result.reason?.status === 404) return defaultValue;
            console.warn(`[Fetch-and-Sync] Error fetching secondary data:`, result.reason);
            return defaultValue;
        };

        const completeProfile = {
            user: profile,
            questionnaire: getResultValue(questionnaireResult, null),
            scanHistory: getResultValue(scansResult, []),
            recommendations: getResultValue(recommendationsResult, []),
            fetchedAt: new Date().toISOString(),
        };

        console.log('[Fetch-and-Sync] Complete profile fetched successfully');
        return completeProfile;
    } catch (error) {
        console.error('[Fetch-and-Sync] Failed to fetch complete profile:', error);
        throw error;
    }
};

export const isOnline = async () => {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        await fetch(buildApiUrl('/health'), { signal: controller.signal, method: 'GET' });
        clearTimeout(timeout);
        return true;
    } catch {
        return false;
    }
};

export const authFetch = async (path, options = {}) => request(path, options, { auth: true });
