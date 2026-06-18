import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Alert,
    Animated,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS, SIZES } from '../config/theme';
import { resetPassword } from '../services/api';

const ResetPasswordScreen = ({ navigation, route }) => {
    const resetToken = route?.params?.resetToken || null;
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [newPasswordFocused, setNewPasswordFocused] = useState(false);
    const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(20)).current;
    const hasAnimated = useRef(false);

    useEffect(() => {
        if (!resetToken) {
            Alert.alert(
                'Invalid Link',
                'This password reset link is invalid or has expired. Please request a new one.',
                [{ text: 'OK', onPress: () => navigation.replace('Login') }]
            );
            return;
        }

        if (hasAnimated.current) return;

        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
            }),
        ]).start(() => {
            hasAnimated.current = true;
        });
    }, [resetToken, navigation]);

    const handleResetPassword = async () => {
        if (!newPassword.trim() || !confirmPassword.trim()) {
            Alert.alert('Missing Fields', 'Please enter both password fields.');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('Password Mismatch', 'Passwords do not match. Please try again.');
            return;
        }

        if (newPassword.length < 8) {
            Alert.alert('Password Too Short', 'Password must be at least 8 characters long.');
            return;
        }

        setLoading(true);

        try {
            const response = await resetPassword(resetToken, newPassword.trim());
            
            Alert.alert(
                'Success',
                'Your password has been reset successfully. You can now log in with your new password.',
                [
                    {
                        text: 'OK',
                        onPress: () => {
                            navigation.replace('Login');
                        },
                    },
                ]
            );
        } catch (error) {
            const errorMessage = error?.message || 'Failed to reset password. Please try again.';
            Alert.alert('Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        Alert.alert(
            'Cancel Reset',
            'Are you sure you want to cancel? Your changes will not be saved.',
            [
                { text: 'No', style: 'cancel' },
                {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: () => {
                        navigation.replace('Login');
                    },
                },
            ]
        );
    };

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

            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.flex}
            >
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    <Animated.View
                        style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
                    >
                        <LinearGradient
                            colors={COLORS.accentGradient}
                            style={styles.iconBorder}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.iconInner}>
                                <Text style={styles.icon}>🔒</Text>
                            </View>
                        </LinearGradient>

                        <Text style={styles.title}>Set New Password</Text>
                        <Text style={styles.subtitle}>
                            Enter your new password below to secure your account.
                        </Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>New Password</Text>
                            <View
                                style={[
                                    styles.inputWrapper,
                                    newPasswordFocused && styles.inputWrapperFocused,
                                ]}
                            >
                                <Text style={styles.inputIcon}>🔑</Text>
                                <TextInput
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    placeholder="Enter new password (min. 8 characters)"
                                    placeholderTextColor={COLORS.placeholder}
                                    secureTextEntry={!showNewPassword}
                                    style={styles.input}
                                    onFocus={() => setNewPasswordFocused(true)}
                                    onBlur={() => setNewPasswordFocused(false)}
                                />
                                <TouchableOpacity
                                    style={styles.toggleButton}
                                    onPress={() => setShowNewPassword(!showNewPassword)}
                                >
                                    <Text style={styles.toggleText}>
                                        {showNewPassword ? '🙈' : '👁️'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Confirm Password</Text>
                            <View
                                style={[
                                    styles.inputWrapper,
                                    confirmPasswordFocused && styles.inputWrapperFocused,
                                ]}
                            >
                                <Text style={styles.inputIcon}>🔒</Text>
                                <TextInput
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    placeholder="Confirm your new password"
                                    placeholderTextColor={COLORS.placeholder}
                                    secureTextEntry={!showConfirmPassword}
                                    style={styles.input}
                                    onFocus={() => setConfirmPasswordFocused(true)}
                                    onBlur={() => setConfirmPasswordFocused(false)}
                                />
                                <TouchableOpacity
                                    style={styles.toggleButton}
                                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                >
                                    <Text style={styles.toggleText}>
                                        {showConfirmPassword ? '🙈' : '👁️'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.buttonGroup}>
                            <LinearGradient
                                colors={COLORS.primaryGradient}
                                style={styles.submitButton}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                disabled={loading}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <TouchableOpacity
                                    style={styles.submitButtonInner}
                                    onPress={handleResetPassword}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#FFFFFF" size="small" />
                                    ) : (
                                        <Text style={styles.submitButtonText}>Reset Password</Text>
                                    )}
                                </TouchableOpacity>
                            </LinearGradient>

                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={handleCancel}
                                disabled={loading}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    flex: {
        flex: 1,
    },
    decorCircleOne: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
        backgroundColor: 'rgba(0, 210, 255, 0.05)',
        top: -100,
        right: -50,
        zIndex: 0,
    },
    decorCircleTwo: {
        position: 'absolute',
        width: 250,
        height: 250,
        borderRadius: 125,
        backgroundColor: 'rgba(108, 99, 255, 0.05)',
        bottom: -80,
        left: -30,
        zIndex: 0,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: SIZES.lg,
    },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: SIZES.radiusXl,
        padding: SIZES.xl,
        alignItems: 'center',
        ...SHADOWS.medium,
        zIndex: 1,
    },
    iconBorder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SIZES.lg,
    },
    iconInner: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: COLORS.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    icon: {
        fontSize: 36,
    },
    title: {
        fontSize: 28,
        fontWeight: '800',
        color: COLORS.textPrimary,
        marginBottom: SIZES.sm,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 15,
        color: COLORS.textSecondary,
        marginBottom: SIZES.xl,
        textAlign: 'center',
        lineHeight: 22,
    },
    inputGroup: {
        width: '100%',
        marginBottom: SIZES.lg,
    },
    inputLabel: {
        fontSize: 14,
        color: COLORS.textLabel,
        fontWeight: '600',
        marginBottom: SIZES.xs,
        marginLeft: SIZES.sm,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surfaceLight,
        borderRadius: SIZES.radiusMd,
        borderWidth: 1.5,
        borderColor: COLORS.border,
        paddingHorizontal: SIZES.md,
        height: SIZES.inputHeight,
        transition: 'borderColor 0.3s ease',
    },
    inputWrapperFocused: {
        borderColor: COLORS.borderFocused,
        shadowColor: COLORS.borderFocused,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    inputIcon: {
        fontSize: 20,
        marginRight: SIZES.sm,
    },
    input: {
        flex: 1,
        fontSize: 16,
        color: COLORS.textPrimary,
        paddingVertical: 0,
    },
    toggleButton: {
        padding: SIZES.xs,
    },
    toggleText: {
        fontSize: 20,
    },
    buttonGroup: {
        width: '100%',
        marginTop: SIZES.xl,
    },
    submitButton: {
        borderRadius: SIZES.radiusMd,
        overflow: 'hidden',
        marginBottom: SIZES.md,
    },
    submitButtonInner: {
        height: SIZES.buttonHeight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitButtonText: {
        color: '#FFFFFF',
        fontSize: 17,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    cancelButton: {
        height: SIZES.buttonHeight,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderColor: COLORS.border,
        borderRadius: SIZES.radiusMd,
    },
    cancelButtonText: {
        color: COLORS.textTertiary,
        fontSize: 16,
        fontWeight: '600',
    },
});

export default ResetPasswordScreen;
