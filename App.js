import 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as Linking from 'expo-linking';

import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import SplashScreen from './src/screens/SplashScreen';
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import ErrorScreen from './src/screens/ErrorScreen';
import HomeScreen from './src/screens/HomeScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import QuestionnaireScreen from './src/screens/QuestionnaireScreen';
import ImageCaptureScreen from './src/screens/ImageCaptureScreen';
import ResultScreen from './src/screens/ResultScreen';
import RecommendationsScreen from './src/screens/RecommendationsScreen';

const Stack = createStackNavigator();

const DEEP_LINK_PREFIX = 'https://kneeoa.online/';

// ✅ Shared refs for auth readiness and pending links - accessible by both App and NavigationHandler
const authReadyRef = useRef(false);
const pendingLinkRef = useRef(null);

function NavigationHandler({ navigationRef }) {
    const hasHandledInitialLink = useRef(false);
    const pendingLink = pendingLinkRef;  // ✅ Use shared ref
    const isNavigationReady = useRef(false);

    useEffect(() => {
        const handleDeepLink = async (url) => {
            try {
                console.log('[DeepLink] Received URL:', url);

                // CRITICAL FIX: Use URL API for robust query parameter extraction
                // This properly handles URL-encoded JWT tokens with +, %, etc.
                let parsedUrl;
                try {
                    parsedUrl = new URL(url.replace('https://kneeoa.online', 'https://example.com'));
                } catch (e) {
                    console.error('[DeepLink] Failed to parse URL:', url, e);
                    return;
                }

                const path = parsedUrl.pathname;
                const token = parsedUrl.searchParams.get('token');

                console.log('[DeepLink] Path:', path);
                console.log('[DeepLink] Token length:', token?.length);
                console.log('[DeepLink] Token starts with:', token?.substring(0, 30) + '...');
                console.log('[DeepLink] Full token (first 100 chars):', token?.substring(0, 100));

                if (path.startsWith('/reset-password')) {
                    if (!token || token.length === 0) {
                        console.error('[DeepLink] No token found in URL');
                        console.error('[DeepLink] All query params:', Array.from(parsedUrl.searchParams.entries()));
                        return;
                    }

                    // Validate token format (JWT has 3 parts separated by dots)
                    const parts = token.split('.');
                    if (parts.length !== 3) {
                        console.error('[DeepLink] Invalid token format - expected JWT with 3 parts');
                        console.error('[DeepLink] Got parts:', parts.length);
                        return;
                    }

                    console.log('[DeepLink] Token validated as JWT format');

                    // CRITICAL FIX: Wait for BOTH navigation AND auth to be ready
                    if (navigationRef?.isReady() && authReadyRef.current) {
                        console.log('[DeepLink] Navigation AND auth ready, routing to ResetPassword');
                        navigationRef.navigate('ResetPassword', { resetToken: token });
                        hasHandledInitialLink.current = true;
                        pendingLink.current = null;
                    } else {
                        const navReady = navigationRef?.isReady();
                        const authReady = authReadyRef.current;
                        console.log('[DeepLink] Navigation ready:', navReady, 'Auth ready:', authReady);
                        console.log('[DeepLink] Navigation NOT ready, QUEUING link for later');
                        // Store the link for later processing
                        pendingLink.current = { resetToken: token, timestamp: Date.now() };
                    }
                }
            } catch (error) {
                console.error('[DeepLink] Failed to parse deep link:', error);
            }
        };

        // Handle initial deep link (app launched from link)
        Linking.getInitialURL().then((url) => {
            if (url) {
                console.log('[DeepLink] Initial URL received:', url);
                // Don't process immediately - wait for navigation to be ready
                handleDeepLink(url);
            }
        });

        // Handle deep links when app is running in background
        const subscription = Linking.addEventListener('url', ({ url }) => {
            console.log('[DeepLink] Received URL event:', url);
            handleDeepLink(url);
        });

        return () => {
            subscription.remove();
        };
    }, [navigationRef]);

    // CRITICAL FIX: Monitor navigation readiness AND auth readiness, process pending links
    useEffect(() => {
        const checkNavigationReady = () => {
            if (navigationRef?.isReady()) {
                console.log('[DeepLink] Navigation container is now READY');
                isNavigationReady.current = true;

                // Process any pending links (only if auth is also ready)
                if (pendingLink.current && authReadyRef.current) {
                    console.log('[DeepLink] Processing queued deep link (nav + auth ready)');
                    const { resetToken } = pendingLink.current;
                    
                    // Double-check before navigating
                    if (navigationRef.isReady()) {
                        navigationRef.navigate('ResetPassword', { resetToken });
                        pendingLink.current = null;
                        hasHandledInitialLink.current = true;
                    }
                } else if (pendingLink.current && !authReadyRef.current) {
                    console.log('[DeepLink] Waiting for auth to be ready before processing queued link');
                }
            }
        };

        // Initial check
        checkNavigationReady();

        // Poll periodically until navigation is ready (safety net)
        const pollInterval = setInterval(() => {
            if (!isNavigationReady.current && navigationRef?.isReady()) {
                checkNavigationReady();
            }
        }, 100);

        return () => {
            clearInterval(pollInterval);
        };
    }, [navigationRef]);

    return null;
}

export default function App() {
    const navigationRef = useNavigationContainerRef();

    // ✅ Update authReadyRef when AuthContext signals readiness
    const { authReady } = useAuth();
    useEffect(() => {
        if (authReady && !authReadyRef.current) {
            console.log('[App] AuthContext is now READY');
            authReadyRef.current = true;
            
            // Process any pending deep links now that auth is ready
            if (navigationRef?.isReady() && pendingLinkRef.current) {
                console.log('[App] Processing pending deep link after auth ready');
                const { resetToken } = pendingLinkRef.current;
                navigationRef.navigate('ResetPassword', { resetToken });
                pendingLinkRef.current = null;
            }
        }
    }, [authReady]);

    // CRITICAL: AuthProvider MUST wrap NavigationContainer to ensure
    // all screens (including LoginScreen) have access to auth methods
    return (
        <AuthProvider>
            <NavigationContainer
            ref={navigationRef}
            linking={{
                prefixes: [DEEP_LINK_PREFIX],
                config: {
                    screens: {
                        ResetPassword: {
                    path: 'reset-password',
                    parse: (path) => {
                        console.log('[Linking Config] Parsing path:', path);
                        // Return empty params - token comes from URL query string handled by NavigationHandler
                        return {};
                    },
                },
                    },
                },
            }}
            onReady={() => {
                console.log('Navigation ready');
            }}
            >
            <Stack.Navigator
                initialRouteName="Splash"
                screenOptions={{
                    headerShown: false,
                    cardStyleInterpolator: ({ current }) => ({
                        cardStyle: {
                            opacity: current.progress,
                        },
                    }),
                }}
            >
                <Stack.Screen name="Splash" component={SplashScreen} />
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Register" component={RegisterScreen} />
                <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
                <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
                <Stack.Screen name="Error" component={ErrorScreen} />
                <Stack.Screen name="Questionnaire" component={QuestionnaireScreen} />
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="History" component={HistoryScreen} />
                <Stack.Screen name="ImageCapture" component={ImageCaptureScreen} />
                <Stack.Screen name="Result" component={ResultScreen} />
                <Stack.Screen name="Recommendations" component={RecommendationsScreen} />
            </Stack.Navigator>
            <NavigationHandler navigationRef={navigationRef} />
        </NavigationContainer>
        </AuthProvider>
    );
}
