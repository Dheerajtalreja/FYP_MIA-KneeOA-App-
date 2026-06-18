import 'react-native-gesture-handler';
import React, { useState, useEffect, useRef } from 'react';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
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

function NavigationHandler({ navigation }) {
    const hasHandledLink = useRef(false);

    useEffect(() => {
        const handleDeepLink = (url) => {
            try {
                const parsedUrl = Linking.parse(url);
                const path = parsedUrl.path || '';

                if (path.startsWith('/reset-password')) {
                    const token = parsedUrl.queryParams?.token;

                    if (token) {
                        navigation.navigate('ResetPassword', { resetToken: token });
                        hasHandledLink.current = true;
                    }
                }
            } catch (error) {
                console.error('Failed to parse deep link:', error);
            }
        };

        // Handle cold start (app opened from deep link)
        Linking.getInitialURL().then((url) => {
            if (url) {
                handleDeepLink(url);
            }
        });

        // Handle hot start (app already running, deep link received)
        const subscription = Linking.addEventListener('url', ({ url }) => {
            handleDeepLink(url);
        });

        return () => {
            subscription.remove();
        };
    }, [navigation]);

    return null;
}

export default function App() {
    return (
        <NavigationContainer
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
            <NavigationHandler navigation={navigation} />
        </NavigationContainer>
    );
}
