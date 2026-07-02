import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { setAuthToken, setRefreshToken as apiSetRefreshToken, clearAuthTokens, loginUser, getProfile } from '../services/api';
import { loadStoredAuthState, persistStoredAuthState, clearStoredAuthState } from '../services/tokenStore';
import { getUser, getLatestQuestionnaire } from '../services/database'; // ✅ FIXED: Added missing database import

// Create the AuthContext
const AuthContext = createContext(null);

/**
 * AuthProvider - Wraps the app to provide authentication state and methods
 * 
 * IMPORTANT: This Provider MUST wrap the entire navigation tree in App.js
 * to ensure all screens can access authentication methods safely.
 */
export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [authReady, setAuthReady] = useState(false);  // ✅ Signal when auth state is loaded
    const [user, setUser] = useState(null);
    const [accessToken, setAccessToken] = useState(null);
    const [refreshToken, setRefreshToken] = useState(null);

    // Load stored auth state on mount
    useEffect(() => {
        const loadAuthState = async () => {
            try {
                console.log('[AuthContext] Loading stored auth state...');
                
                // Defensive: Ensure loadStoredAuthState is a function
                if (typeof loadStoredAuthState !== 'function') {
                    throw new Error('loadStoredAuthState is not a function');
                }

                const state = await loadStoredAuthState();
                
                if (state?.accessToken) {
                    // Update API client first
                    if (typeof setAuthToken === 'function') setAuthToken(state.accessToken);
                    if (typeof apiSetRefreshToken === 'function' && state.refreshToken) apiSetRefreshToken(state.refreshToken);

                    if (typeof setAccessToken === 'function') setAccessToken(state.accessToken);
                    if (typeof setRefreshToken === 'function') setRefreshToken(state.refreshToken || null);

                    // Try to load actual user info from local DB
                    try {
                        // Defensive: Check if getUser is available
                        if (typeof getUser === 'function') {
                            const localUser = await getUser();
                            if (localUser) {
                                if (typeof setUser === 'function') setUser(localUser);
                                if (typeof setIsAuthenticated === 'function') setIsAuthenticated(true);
                                console.log('[AuthContext] Restored user from local DB');
                            } else {
                                // If tokens exist but no DB record, we're in an inconsistent state
                                // We'll mark as authenticated but with minimal info
                                if (typeof setUser === 'function') setUser({ email: 'restored_user' });
                                if (typeof setIsAuthenticated === 'function') setIsAuthenticated(true);
                                console.log('[AuthContext] Tokens found but no local user record');
                            }
                        } else {
                            throw new Error('getUser function not available');
                        }
                    } catch (dbError) {
                        console.warn('[AuthContext] Failed to load local user during init:', dbError);
                        if (typeof setIsAuthenticated === 'function') setIsAuthenticated(true);
                    }
                }
            } catch (error) {
                console.error('[AuthContext] Failed to load auth state:', error);
            } finally {
                if (typeof setIsLoading === 'function') setIsLoading(false);
                if (typeof setAuthReady === 'function') setAuthReady(true);
            }
        };

        loadAuthState();
    }, []);

    /**
     * Safe login function with type checking
     */
    const login = useCallback(async (email, password) => {
        if (typeof email !== 'string' || typeof password !== 'string') {
            throw new Error('Invalid email or password type');
        }

        try {
            console.log('[AuthContext] Attempting login for:', email);
            
            // Import here to avoid circular dependencies
            // loginUser imported at top of file
            const authResponse = await loginUser(email, password);
            
            const token = authResponse?.access_token || authResponse?.token || authResponse?.data?.token;
            const refresh = authResponse?.refresh_token;

            if (!token) {
                throw new Error('No access token received from server');
            }

            // Update state
            setAccessToken(token);
            setRefreshToken(refresh || null);
            setIsAuthenticated(true);
            
            // Persist to secure storage
            await persistStoredAuthState({ accessToken: token, refreshToken: refresh });
            
            // Update API client
            setAuthToken(token);
            if (refresh) apiSetRefreshToken(refresh);

            // Fetch the real user profile so the app can display the correct name
            let profile = null;
            try {
                profile = await getProfile();
            } catch (profileError) {
                console.warn('[AuthContext] Could not fetch profile after login:', profileError);
            }

            console.log('[AuthContext] Login successful');
            return {
                success: true,
                token,
                user: profile || authResponse?.data || authResponse,
            };
        } catch (error) {
            console.error('[AuthContext] Login failed:', error);
            throw error;
        }
    }, []);

    /**
     * Safe logout function with type checking
     */
    const logout = useCallback(async () => {
        try {
            console.log('[AuthContext] Logging out...');
            
            // Clear state
            setIsAuthenticated(false);
            setUser(null);
            setAccessToken(null);
            setRefreshToken(null);
            
            // Clear storage
            await clearStoredAuthState();
            
            // Clear API tokens
            clearAuthTokens();
            
            console.log('[AuthContext] Logout successful');
        } catch (error) {
            console.error('[AuthContext] Logout failed:', error);
            throw error;
        }
    }, []);

    /**
     * Safe update token function
     */
    const updateToken = useCallback(async (newToken, newRefreshToken = null) => {
        if (typeof newToken !== 'string') {
            throw new Error('Invalid token type');
        }

        try {
            setAccessToken(newToken);
            setRefreshToken(newRefreshToken || null);
            await persistStoredAuthState({ accessToken: newToken, refreshToken: newRefreshToken });
            setAuthToken(newToken);
            if (newRefreshToken) apiSetRefreshToken(newRefreshToken);
        } catch (error) {
            console.error('[AuthContext] Failed to update token:', error);
            throw error;
        }
    }, []);

    /**
     * Check if user has completed their medical profile questionnaire
     * @param {string} userId - The user's server_id, email, or id
     * @returns {Promise<Object|null>} - The questionnaire response or null if not completed
     */
    const checkProfileCompletion = useCallback(async (userId) => {
        try {
            if (!userId) {
                console.warn('[AuthContext] No userId provided for profile check');
                return null;
            }

            if (typeof getLatestQuestionnaire !== 'function') {
                throw new Error('getLatestQuestionnaire function not available');
            }

            const questionnaire = await getLatestQuestionnaire(userId);
            return questionnaire || null;
        } catch (error) {
            console.error('[AuthContext] Failed to check profile completion:', error);
            return null;
        }
    }, []);

    // Context value
    const value = {
        isAuthenticated,
        isLoading,
        authReady,  // ✅ Expose auth readiness to consumers
        user,
        accessToken,
        refreshToken,
        login,
        logout,
        updateToken,
        checkProfileCompletion,  // ✅ Add profile check function
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * Custom hook to use AuthContext
 * 
 * SAFETY: Always check if methods exist before calling them
 * Example: const { login } = useAuth(); login?.(email, password);
 */
export const useAuth = () => {
    const context = useContext(AuthContext);
    
    if (context === null) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    // Type-check all methods before returning
    const safeMethods = {
        isAuthenticated: context.isAuthenticated,
        isLoading: context.isLoading,
        // FIX: Expose authReady so App.js can reliably wait for auth hydration before routing.
        authReady: context.authReady,
        user: context.user,
        accessToken: context.accessToken,
        refreshToken: context.refreshToken,
        login: typeof context.login === 'function' ? context.login : undefined,
        logout: typeof context.logout === 'function' ? context.logout : undefined,
        updateToken: typeof context.updateToken === 'function' ? context.updateToken : undefined,
    };

    return safeMethods;
};

export default AuthContext;