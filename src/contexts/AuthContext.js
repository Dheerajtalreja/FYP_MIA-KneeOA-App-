import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { setAuthToken, setRefreshToken as apiSetRefreshToken, clearAuthTokens, loginUser } from '../services/api';
import { loadStoredAuthState, persistStoredAuthState, clearStoredAuthState } from '../services/tokenStore';

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
    const [user, setUser] = useState(null);
    const [accessToken, setAccessToken] = useState(null);
    const [refreshToken, setRefreshToken] = useState(null);

    // Load stored auth state on mount
    useEffect(() => {
        const loadAuthState = async () => {
            try {
                console.log('[AuthContext] Loading stored auth state...');
                const state = await loadStoredAuthState();
                
                if (state?.accessToken) {
                    setAccessToken(state.accessToken);
                    setRefreshToken(state.refreshToken || null);
                    setAuthToken(state.accessToken);
                    
                    // Auto-login if tokens exist
                    setIsAuthenticated(true);
                    setUser({ email: 'logged_in_user' }); // Basic user info
                    console.log('[AuthContext] Auto-login successful');
                }
            } catch (error) {
                console.error('[AuthContext] Failed to load auth state:', error);
            } finally {
                setIsLoading(false);
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
            if (refresh) apiSetRefreshToken(refresh); // FIXED: Use aliased function

            console.log('[AuthContext] Login successful');
            return { success: true, token, user: authResponse?.data || authResponse };
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
            if (newRefreshToken) apiSetRefreshToken(newRefreshToken); // FIXED: Use aliased function
        } catch (error) {
            console.error('[AuthContext] Failed to update token:', error);
            throw error;
        }
    }, []);

    // Context value
    const value = {
        isAuthenticated,
        isLoading,
        user,
        accessToken,
        refreshToken,
        login,
        logout,
        updateToken,
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
