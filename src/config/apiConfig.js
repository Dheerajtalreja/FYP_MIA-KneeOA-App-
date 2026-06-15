const DEFAULT_API_BASE_URL = 'https://kneeoa.online';

const trimTrailingSlash = (value) => String(value || '').trim().replace(/\/+$/, '');

const isHttpsUrl = (value) => /^https:\/\//i.test(String(value || '').trim());

const readCandidate = (value) => {
    const normalized = trimTrailingSlash(value);
    if (!normalized) return null;
    if (!isHttpsUrl(normalized)) return null;
    return normalized;
};

const environment = String(process.env.EXPO_PUBLIC_API_ENV || process.env.NODE_ENV || 'production').toLowerCase();

const resolveEnvironmentBaseUrl = () => {
    if (environment === 'development') {
        return readCandidate(process.env.EXPO_PUBLIC_API_BASE_URL_DEV);
    }

    if (environment === 'staging') {
        return readCandidate(process.env.EXPO_PUBLIC_API_BASE_URL_STAGING);
    }

    return readCandidate(process.env.EXPO_PUBLIC_API_BASE_URL_PROD);
};

const resolveApiBaseUrl = () => {
    const candidates = [
        resolveEnvironmentBaseUrl(),
        readCandidate(process.env.EXPO_PUBLIC_API_BASE_URL),
        readCandidate(process.env.EXPO_PUBLIC_BACKEND_URL),
        readCandidate(DEFAULT_API_BASE_URL),
    ];

    const resolved = candidates.find(Boolean);
    if (!resolved) {
        throw new Error('A secure HTTPS API base URL is required.');
    }

    return resolved;
};

export const API_ENVIRONMENT = environment;
export const API_BASE_URL = resolveApiBaseUrl();

export const buildApiUrl = (path) => {
    const cleanedPath = path.startsWith('/') ? path : `/${path}`;
    return `${API_BASE_URL}${cleanedPath}`;
};

export const isSecureApiBaseUrl = () => isHttpsUrl(API_BASE_URL);
