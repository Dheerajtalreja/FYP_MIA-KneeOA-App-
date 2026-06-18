import 'react-native-gesture-handler';
import React, { useEffect, useRef } from 'react';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import * as Linking from 'expo-linking';

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

function NavigationHandler({ navigationRef }) {
    const hasHandledInitialLink = useRef(false);
    const pendingLink = useRef(null);

    useEffect(() => {
        const handleDeepLink = async (url) => {
            try {
                const parsedUrl = Linking.parse(url);
                const path = parsedUrl.path || '';

                console.log('[DeepLink] Parsed URL:', url);
                console.log('[DeepLink] Path:', path);
                console.log('[DeepLink] Query params:', parsedUrl.queryParams);

                if (path.startsWith('/reset-password')) {
                    const token = parsedUrl.queryParams?.token;

                    if (!token) {
                        console.error('[DeepLink] No token found in URL');
                        return;
                    }

                    console.log('[DeepLink] Token extracted:', token);

                    // Wait for navigation to be ready
                    if (navigationRef?.isReady()) {
                        console.log('[DeepLink] Navigating to ResetPassword screen');
                        navigationRef.navigate('ResetPassword', { resetToken: token });
                        hasHandledInitialLink.current = true;
                        pendingLink.current = null;
                    } else {
                        console.log('[DeepLink] Navigation not ready, storing pending link');
                        pendingLink.current = { resetToken: token };
                    }
                }
            } catch (error) {
                console.error('[DeepLink] Failed to parse deep link:', error);
            }
        };

        // Handle initial deep link (app launched from link)
        Linking.getInitialURL().then((url) => {
            if (url) {
                console.log('[DeepLink] Initial URL:', url);
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

    // Check for pending link when navigation becomes ready
    useEffect(() => {
        if (navigationRef?.isReady() && pendingLink.current) {
            console.log('[DeepLink] Navigation ready, processing pending link');
            const { resetToken } = pendingLink.current;
            navigationRef.navigate('ResetPassword', { resetToken });
            pendingLink.current = null;
        }
    }, [navigationRef]);

    return null;
}

export default function App() {
    const navigationRef = useNavigationContainerRef();

    return (
        <NavigationContainer
            ref={navigationRef}
            linking={{
                prefixes: [DEEP_LINK_PREFIX],
                config: {
                    screens: {
                        ResetPassword: 'reset-password',
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
    );
}
