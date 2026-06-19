import 'react-native-gesture-handler';
import React, { useEffect, useRef, Component } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, StyleSheet } from 'react-native';
import * as Linking from 'expo-linking';
import { URL as PolyfillURL } from 'react-native-url-polyfill';

// Ensure URL is available globally for environments that lack it
if (typeof global.URL === 'undefined') {
    global.URL = PolyfillURL;
}

/**
 * Global Error Boundary - Catches any unhandled errors during rendering
 * and displays a fallback UI instead of crashing the entire app.
 */
class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('[ErrorBoundary] Caught error:', error);
        console.error('[ErrorBoundary] Error info:', errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Something went wrong.</Text>
                    <Text style={styles.errorSubtext}>Please restart the app.</Text>
                </View>
            );
        }

        return this.props.children;
    }
}

const styles = StyleSheet.create({
    errorContainer: {
        flex: 1,
        backgroundColor: '#fff',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    errorText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#ff0000',
        marginBottom: 10,
    },
    errorSubtext: {
        fontSize: 14,
        color: '#666',
    },
});

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

/**
 * NavigationHandler - Handles deep links and navigation state transitions.
 * This component is a child of NavigationContainer so it can access navigation state.
 */
function NavigationHandler({ navigationRef, authReadyRef, pendingLinkRef }) {
    const isNavigationReady = useRef(false);

    useEffect(() => {
        const handleDeepLink = async (url) => {
            try {
                console.log('[DeepLink] Received URL:', url);

                // Use URL API for robust query parameter extraction
                let parsedUrl;
                try {
                    parsedUrl = new URL(url.replace('https://kneeoa.online', 'https://example.com'));
                } catch (e) {
                    console.error('[DeepLink] Failed to parse URL:', url, e);
                    return;
                }

                const path = parsedUrl.pathname;
                const token = parsedUrl.searchParams.get('token');

                if (path.startsWith('/reset-password')) {
                    if (!token) {
                        console.error('[DeepLink] No token found in URL');
                        return;
                    }

                    // Validate token format (JWT has 3 parts separated by dots)
                    const parts = token.split('.');
                    if (parts.length !== 3) {
                        console.error('[DeepLink] Invalid token format');
                        return;
                    }

                    // Wait for BOTH navigation AND auth to be ready
                    if (navigationRef?.isReady() && authReadyRef.current) {
                        console.log('[DeepLink] Routing to ResetPassword');
                        navigationRef.navigate('ResetPassword', { resetToken: token });
                        pendingLinkRef.current = null;
                    } else {
                        console.log('[DeepLink] Queuing link for later processing');
                        pendingLinkRef.current = { resetToken: token, timestamp: Date.now() };
                    }
                }
            } catch (error) {
                console.error('[DeepLink] Failed to parse deep link:', error);
            }
        };

        // Handle initial deep link
        Linking.getInitialURL().then((url) => {
            if (url) handleDeepLink(url);
        });

        // Handle deep links when app is running
        const subscription = Linking.addEventListener('url', ({ url }) => {
            handleDeepLink(url);
        });

        return () => subscription.remove();
    }, [navigationRef, authReadyRef, pendingLinkRef]);

    // Monitor navigation readiness
    useEffect(() => {
        const checkNavigationReady = () => {
            if (navigationRef?.isReady()) {
                isNavigationReady.current = true;

                // Process any pending links if auth is also ready
                if (pendingLinkRef.current && authReadyRef.current) {
                    const { resetToken } = pendingLinkRef.current;
                    navigationRef.navigate('ResetPassword', { resetToken });
                    pendingLinkRef.current = null;
                }
            }
        };

        const pollInterval = setInterval(checkNavigationReady, 100);
        return () => clearInterval(pollInterval);
    }, [navigationRef, authReadyRef, pendingLinkRef]);

    return null;
}

/**
 * AppNavigator - Contains the main navigation tree and Auth context consumption.
 * This must be a child of AuthProvider.
 */
function AppNavigator() {
    const navigationRef = useNavigationContainerRef();
    const { authReady } = useAuth();

    // Hooks MUST be inside a component
    const authReadyRef = useRef(false);
    const pendingLinkRef = useRef(null);

    // Update authReadyRef when AuthContext signals readiness
    useEffect(() => {
        if (authReady && !authReadyRef.current) {
            console.log('[AppNavigator] AuthContext is now READY');
            authReadyRef.current = true;
            
            // Process any pending deep links now that auth is ready
            if (navigationRef?.isReady() && pendingLinkRef.current) {
                const { resetToken } = pendingLinkRef.current;
                navigationRef.navigate('ResetPassword', { resetToken });
                pendingLinkRef.current = null;
            }
        }
    }, [authReady, navigationRef]);

    return (
        <NavigationContainer
            ref={navigationRef}
            linking={{
                prefixes: [DEEP_LINK_PREFIX],
                config: {
                    screens: {
                        ResetPassword: {
                            path: 'reset-password',
                            parse: () => ({}),
                        },
                    },
                },
            }}
            onReady={() => console.log('Navigation ready')}
            onStateChange={(state) => {
                // Useful for debugging navigation issues
                console.log('[Navigation] State changed');
            }}
        >
            <Stack.Navigator
                initialRouteName="Splash"
                screenOptions={{
                    headerShown: false,
                    cardStyleInterpolator: ({ current, next, layouts }) => {
                        return {
                            cardStyle: {
                                transform: [
                                    {
                                        translateX: current.progress.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [layouts.screen.width, 0],
                                        }),
                                    },
                                    {
                                        scale: current.progress.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.95, 1],
                                        }),
                                    },
                                ],
                                opacity: current.progress.interpolate({
                                    inputRange: [0, 0.5, 1],
                                    outputRange: [0, 0, 1],
                                }),
                            },
                            overlayStyle: {
                                opacity: current.progress.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0, 0.5],
                                }),
                            },
                        };
                    },
                    transitionSpec: {
                        open: { animation: 'spring', config: { stiffness: 1000, damping: 500, mass: 3, overshootClamping: true, restDisplacementThreshold: 0.01, restSpeedThreshold: 0.01 } },
                        close: { animation: 'spring', config: { stiffness: 1000, damping: 500, mass: 3, overshootClamping: true, restDisplacementThreshold: 0.01, restSpeedThreshold: 0.01 } },
                    },
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
            <NavigationHandler
                navigationRef={navigationRef}
                authReadyRef={authReadyRef}
                pendingLinkRef={pendingLinkRef}
            />
        </NavigationContainer>
    );
}

/**
 * Root App Component
 * Provides Global Contexts and renders the main navigator.
 */
export default function App() {
    return (
        <ErrorBoundary>
            <AuthProvider>
                <AppNavigator />
            </AuthProvider>
        </ErrorBoundary>
    );
}
