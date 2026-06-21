import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Animated,
    StatusBar,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { hydrateAuthState } from '../services/api';
import { getUser, getLatestQuestionnaire } from '../services/database';

const { width, height } = Dimensions.get('window');

const SplashScreen = ({ navigation }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.3)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const subtitleFade = useRef(new Animated.Value(0)).current;
    const dotAnim1 = useRef(new Animated.Value(0)).current;
    const dotAnim2 = useRef(new Animated.Value(0)).current;
    const dotAnim3 = useRef(new Animated.Value(0)).current;
    const ringScale = useRef(new Animated.Value(0.8)).current;
    const ringOpacity = useRef(new Animated.Value(0.6)).current;

    useEffect(() => {
        let active = true;

        // Main logo animation
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 4,
                tension: 40,
                useNativeDriver: true,
            }),
        ]).start();

        // Pulsing ring animation
        const ringLoop = Animated.loop(
            Animated.sequence([
                Animated.parallel([
                    Animated.timing(ringScale, {
                        toValue: 1.4,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(ringOpacity, {
                        toValue: 0,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.timing(ringScale, {
                        toValue: 0.8,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                    Animated.timing(ringOpacity, {
                        toValue: 0.6,
                        duration: 0,
                        useNativeDriver: true,
                    }),
                ]),
            ])
        );
        ringLoop.start();

        // Subtitle fade in
        setTimeout(() => {
            Animated.timing(subtitleFade, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }).start();
        }, 600);

        // Loading dots animation
        let dotsLoop;
        const dotsTimer = setTimeout(() => {
            dotsLoop = Animated.loop(
                Animated.stagger(200, [
                    Animated.sequence([
                        Animated.timing(dotAnim1, { toValue: 1, duration: 400, useNativeDriver: true }),
                        Animated.timing(dotAnim1, { toValue: 0, duration: 400, useNativeDriver: true }),
                    ]),
                    Animated.sequence([
                        Animated.timing(dotAnim2, { toValue: 1, duration: 400, useNativeDriver: true }),
                        Animated.timing(dotAnim2, { toValue: 0, duration: 400, useNativeDriver: true }),
                    ]),
                    Animated.sequence([
                        Animated.timing(dotAnim3, { toValue: 1, duration: 400, useNativeDriver: true }),
                        Animated.timing(dotAnim3, { toValue: 0, duration: 400, useNativeDriver: true }),
                    ]),
                ])
            );
            dotsLoop.start();
        }, 800);

        // Navigate to the authenticated route after bootstrapping the persisted session.
        const timer = setTimeout(() => {
            if (!navigation) return; // Basic safety check

            performNavigationTransition();

            async function performNavigationTransition() {
                try {
                    const authState = await hydrateAuthState();
                    const accessToken = authState?.accessToken || null;

                    if (!active) return; // Prevent state updates if component unmounted

                    if (accessToken) {
                        try {
                            const user = await getUser();
                            const userKey = user?.server_id || user?.email || user?.id;

                            if (userKey) {
                                const questionnaire = await getLatestQuestionnaire(userKey);
                                if (questionnaire) {
                                    if (active) navigation.replace('Home');
                                    return;
                                }
                            }
                            if (active) navigation.replace('Questionnaire');
                        } catch (dbError) {
                            console.warn('[Splash] Failed to check state, defaulting to Home:', dbError);
                            if (active) navigation.replace('Home');
                        }
                    } else {
                        if (active) navigation.replace('Login');
                    }
                } catch (hydrationError) {
                    if (!active) return;
                    console.error('[Splash] Auth hydration failed:', hydrationError);
                    if (active) navigation.replace('Login');
                }
            }
        }, 3000);

        return () => {
            active = false;
            clearTimeout(timer);
            clearTimeout(dotsTimer);
            ringLoop.stop();           // Kill the ring loop
            if (dotsLoop) dotsLoop.stop(); // Kill the dots loop
        };
    }, []);

    const dot1Y = dotAnim1.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
    const dot2Y = dotAnim2.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });
    const dot3Y = dotAnim3.interpolate({ inputRange: [0, 1], outputRange: [0, -8] });

    return (
        <LinearGradient
            colors={['#0F2027', '#203A43', '#2C5364']}
            style={styles.container}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
            <StatusBar barStyle="light-content" backgroundColor="#0F2027" />

            {/* Decorative circles */}
            <View style={styles.decorCircle1} />
            <View style={styles.decorCircle2} />
            <View style={styles.decorCircle3} />

            <Animated.View
                style={[
                    styles.logoContainer,
                    {
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }],
                    },
                ]}
            >
                {/* Pulsing ring */}
                <Animated.View
                    style={[
                        styles.pulseRing,
                        {
                            transform: [{ scale: ringScale }],
                            opacity: ringOpacity,
                        },
                    ]}
                />

                {/* Logo circle with gradient border */}
                <LinearGradient
                    colors={['#00D2FF', '#3A7BD5', '#6C63FF']}
                    style={styles.logoBorder}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={styles.logoInner}>
                        <Text style={styles.logoIcon}>🦴</Text>
                    </View>
                </LinearGradient>
            </Animated.View>

            <Animated.View style={{ opacity: fadeAnim }}>
                <Text style={styles.appName}>KneeOA Engine</Text>
                <LinearGradient
                    colors={['#00D2FF', '#6C63FF']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.titleUnderline}
                />
            </Animated.View>

            <Animated.Text style={[styles.tagline, { opacity: subtitleFade }]}>
                Medical Image Analysis
            </Animated.Text>

            <Animated.Text style={[styles.subtitleSmall, { opacity: subtitleFade }]}>
                AI-Powered Knee Osteoarthritis Detection
            </Animated.Text>

            {/* Loading dots */}
            <View style={styles.dotsContainer}>
                <Animated.View style={[styles.dot, { transform: [{ translateY: dot1Y }] }]} />
                <Animated.View style={[styles.dot, { transform: [{ translateY: dot2Y }] }]} />
                <Animated.View style={[styles.dot, { transform: [{ translateY: dot3Y }] }]} />
            </View>

            <Animated.Text style={[styles.versionText, { opacity: subtitleFade }]}>
                v1.0.0
            </Animated.Text>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    decorCircle1: {
        position: 'absolute',
        top: -60,
        right: -60,
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(0, 210, 255, 0.06)',
    },
    decorCircle2: {
        position: 'absolute',
        bottom: -40,
        left: -40,
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: 'rgba(108, 99, 255, 0.06)',
    },
    decorCircle3: {
        position: 'absolute',
        top: height * 0.3,
        left: -30,
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(58, 123, 213, 0.05)',
    },
    logoContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 30,
    },
    pulseRing: {
        position: 'absolute',
        width: 160,
        height: 160,
        borderRadius: 80,
        borderWidth: 2,
        borderColor: 'rgba(0, 210, 255, 0.4)',
    },
    logoBorder: {
        width: 130,
        height: 130,
        borderRadius: 65,
        padding: 4,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoInner: {
        width: 122,
        height: 122,
        borderRadius: 61,
        backgroundColor: '#1a2a3a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoIcon: {
        fontSize: 55,
    },
    appName: {
        fontSize: 44,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 4,
        textAlign: 'center',
    },
    titleUnderline: {
        height: 3,
        borderRadius: 2,
        marginTop: 8,
        width: 80,
        alignSelf: 'center',
    },
    tagline: {
        fontSize: 18,
        color: '#00D2FF',
        marginTop: 16,
        fontWeight: '600',
        letterSpacing: 1,
    },
    subtitleSmall: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.5)',
        marginTop: 8,
        letterSpacing: 0.5,
    },
    dotsContainer: {
        flexDirection: 'row',
        marginTop: 50,
        gap: 8,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#00D2FF',
    },
    versionText: {
        position: 'absolute',
        bottom: 40,
        fontSize: 12,
        color: 'rgba(255,255,255,0.3)',
        letterSpacing: 1,
    },
});

export default SplashScreen;
