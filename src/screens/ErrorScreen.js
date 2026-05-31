import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS, SIZES } from '../config/theme';

const ErrorScreen = ({ navigation, route }) => {
    const title = route.params?.title || 'Something went wrong';
    const message =
        route.params?.message ||
        'We could not complete that action. Please try again or return to the previous screen.';
    const retryRoute = route.params?.retryRoute || 'Login';
    const retryLabel = route.params?.retryLabel || 'Try Again';

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const liftAnim = useRef(new Animated.Value(24)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 420,
                useNativeDriver: true,
            }),
            Animated.timing(liftAnim, {
                toValue: 0,
                duration: 420,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <LinearGradient
            colors={COLORS.headerGradient}
            style={styles.container}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
        >
            <StatusBar barStyle="light-content" backgroundColor={COLORS.gradientStart} />
            <View style={styles.decorCircleOne} />
            <View style={styles.decorCircleTwo} />

            <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: liftAnim }] }]}>
                <LinearGradient
                    colors={COLORS.dangerGradient}
                    style={styles.iconBorder}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={styles.iconInner}>
                        <Text style={styles.icon}>!</Text>
                    </View>
                </LinearGradient>

                <Text style={styles.title}>{title}</Text>
                <Text style={styles.message}>{message}</Text>

                <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate(retryRoute)}
                    style={styles.primaryAction}
                >
                    <LinearGradient
                        colors={COLORS.fullPrimaryGradient}
                        style={styles.primaryGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Text style={styles.primaryText}>{retryLabel}</Text>
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => navigation.replace('Login')} style={styles.secondaryAction}>
                    <Text style={styles.secondaryText}>Back to Login</Text>
                </TouchableOpacity>
            </Animated.View>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    decorCircleOne: {
        position: 'absolute',
        top: -40,
        right: -40,
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: 'rgba(255, 82, 82, 0.08)',
    },
    decorCircleTwo: {
        position: 'absolute',
        bottom: -35,
        left: -35,
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: 'rgba(0, 210, 255, 0.07)',
    },
    card: {
        width: '100%',
        maxWidth: 420,
        borderRadius: 28,
        padding: 24,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        ...SHADOWS.medium,
    },
    iconBorder: {
        width: 76,
        height: 76,
        borderRadius: 38,
        padding: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconInner: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: COLORS.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    icon: {
        color: COLORS.error,
        fontSize: 34,
        fontWeight: '900',
        marginTop: -2,
    },
    title: {
        color: COLORS.textPrimary,
        fontSize: 26,
        fontWeight: '800',
        textAlign: 'center',
    },
    message: {
        color: COLORS.textSecondary,
        fontSize: 14,
        lineHeight: 20,
        textAlign: 'center',
        marginTop: 10,
        marginBottom: 22,
    },
    primaryAction: {
        width: '100%',
    },
    primaryGradient: {
        height: 54,
        borderRadius: SIZES.radiusLg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    primaryText: {
        color: COLORS.textPrimary,
        fontSize: 16,
        fontWeight: '800',
    },
    secondaryAction: {
        marginTop: 14,
        paddingVertical: 8,
        paddingHorizontal: 14,
    },
    secondaryText: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: '700',
    },
});

export default ErrorScreen;
