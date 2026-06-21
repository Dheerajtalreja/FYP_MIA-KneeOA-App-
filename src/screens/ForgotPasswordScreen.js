import React, { useEffect, useRef, useState } from 'react';
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
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SHADOWS, SIZES } from '../config/theme';
import { requestOtpCode, verifyOtpAndResetPassword } from '../services/api';

const ForgotPasswordScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [otpCode, setOtpCode] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [focused, setFocused] = useState(false);
    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState('email');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(24)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 450,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 450,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const isPasswordStrong = (value) => {
        return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(value);
    };

    const handleRequestOtp = async () => {
        const normalizedEmail = email.trim();

        if (!normalizedEmail) {
            Alert.alert('Email required', 'Enter the email address tied to your account.');
            return;
        }

        setLoading(true);

        try {
            await requestOtpCode(normalizedEmail);
            setStep('reset');
            Alert.alert(
                'Code sent',
                'A 6-digit reset code has been sent to your email. Enter the code and choose a new password below.'
            );
        } catch (error) {
            Alert.alert(
                'Unable to send reset code',
                error?.message || 'Please try again in a few moments.'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleResetWithOtp = async () => {
        const normalizedEmail = email.trim();
        const normalizedOtp = otpCode.trim();

        if (!normalizedEmail) {
            Alert.alert('Email required', 'Enter the email address tied to your account.');
            return;
        }

        if (!/^\d{6}$/.test(normalizedOtp)) {
            Alert.alert('Invalid code', 'Please enter the 6-digit code sent to your email.');
            return;
        }

        if (!newPassword || !confirmPassword) {
            Alert.alert('Missing fields', 'Please enter both password fields.');
            return;
        }

        if (newPassword !== confirmPassword) {
            Alert.alert('Password mismatch', 'The two passwords do not match.');
            return;
        }

        if (!isPasswordStrong(newPassword)) {
            Alert.alert(
                'Weak password',
                'Use at least 8 characters, including uppercase, lowercase, a number, and a symbol.'
            );
            return;
        }

        setLoading(true);

        try {
            await verifyOtpAndResetPassword({
                email: normalizedEmail,
                otpCode: normalizedOtp,
                newPassword,
            });

            Alert.alert(
                'Password updated',
                'Your password has been reset successfully. You can now sign in with your new password.',
                [
                    {
                        text: 'Back to Login',
                        onPress: () => navigation.replace('Login'),
                    },
                ]
            );
        } catch (error) {
            Alert.alert(
                'Unable to reset password',
                error?.message || 'The reset code may be invalid or expired.'
            );
        } finally {
            setLoading(false);
        }
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

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                        <LinearGradient
                            colors={COLORS.accentGradient}
                            style={styles.iconBorder}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.iconInner}>
                                <Text style={styles.icon}>🔑</Text>
                            </View>
                        </LinearGradient>

                        <Text style={styles.title}>Reset Password</Text>
                        <Text style={styles.subtitle}>
                            {step === 'email'
                                ? 'Enter your email to receive a 6-digit reset code.'
                                : 'Enter the code from your email and choose a new password.'}
                        </Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Email Address</Text>
                            <View style={[styles.inputWrapper, focused && styles.inputWrapperFocused]}>
                                <Text style={styles.inputIcon}>✉️</Text>
                                <TextInput
                                    value={email}
                                    onChangeText={setEmail}
                                    placeholder="Enter your account email"
                                    placeholderTextColor={COLORS.placeholder}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    style={styles.input}
                                    onFocus={() => setFocused(true)}
                                    onBlur={() => setFocused(false)}
                                />
                            </View>
                        </View>

                        {step === 'reset' && (
                            <>
                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Reset Code</Text>
                                    <View style={[styles.inputWrapper, focused && styles.inputWrapperFocused]}>
                                        <Text style={styles.inputIcon}>🔢</Text>
                                        <TextInput
                                            value={otpCode}
                                            onChangeText={(value) => setOtpCode(value.replace(/[^0-9]/g, '').slice(0, 6))}
                                            placeholder="Enter 6-digit code"
                                            placeholderTextColor={COLORS.placeholder}
                                            keyboardType="number-pad"
                                            maxLength={6}
                                            style={styles.input}
                                            onFocus={() => setFocused(true)}
                                            onBlur={() => setFocused(false)}
                                        />
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>New Password</Text>
                                    <View style={[styles.inputWrapper, focused && styles.inputWrapperFocused]}>
                                        <Text style={styles.inputIcon}>🔐</Text>
                                        <TextInput
                                            value={newPassword}
                                            onChangeText={setNewPassword}
                                            placeholder="Create a new password"
                                            placeholderTextColor={COLORS.placeholder}
                                            secureTextEntry={!showNewPassword}
                                            style={styles.input}
                                            onFocus={() => setFocused(true)}
                                            onBlur={() => setFocused(false)}
                                        />
                                        <TouchableOpacity onPress={() => setShowNewPassword((value) => !value)}>
                                            <Text style={styles.toggleText}>{showNewPassword ? '🙈' : '👁️'}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.inputLabel}>Confirm Password</Text>
                                    <View style={[styles.inputWrapper, focused && styles.inputWrapperFocused]}>
                                        <Text style={styles.inputIcon}>🔒</Text>
                                        <TextInput
                                            value={confirmPassword}
                                            onChangeText={setConfirmPassword}
                                            placeholder="Confirm your new password"
                                            placeholderTextColor={COLORS.placeholder}
                                            secureTextEntry={!showConfirmPassword}
                                            style={styles.input}
                                            onFocus={() => setFocused(true)}
                                            onBlur={() => setFocused(false)}
                                        />
                                        <TouchableOpacity onPress={() => setShowConfirmPassword((value) => !value)}>
                                            <Text style={styles.toggleText}>{showConfirmPassword ? '🙈' : '👁️'}</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </>
                        )}

                        <Text style={styles.note}>
                            {step === 'email'
                                ? 'We’ll send a 6-digit reset code if the email is registered.'
                                : 'Use the code and your new password to finish the reset.'}
                        </Text>

                        <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={step === 'email' ? handleRequestOtp : handleResetWithOtp}
                            disabled={loading}
                        >
                            <LinearGradient
                                colors={COLORS.fullPrimaryGradient}
                                style={[styles.primaryButton, loading && styles.primaryButtonDisabled]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                {loading ? (
                                    <ActivityIndicator color="#FFFFFF" size="small" />
                                ) : (
                                    <Text style={styles.primaryButtonText}>
                                        {step === 'email' ? 'Send Reset Code' : 'Reset Password'}
                                    </Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        {step === 'reset' && (
                            <TouchableOpacity
                                onPress={handleRequestOtp}
                                style={styles.secondaryButton}
                                disabled={loading}
                            >
                                <Text style={styles.secondaryButtonText}>Resend Code</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity onPress={() => navigation.replace('Login')} style={styles.backButton}>
                            <Text style={styles.backButtonText}>Back to Login</Text>
                        </TouchableOpacity>
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
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 24,
    },
    decorCircleOne: {
        position: 'absolute',
        top: -50,
        right: -50,
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: 'rgba(0, 210, 255, 0.08)',
    },
    decorCircleTwo: {
        position: 'absolute',
        bottom: -40,
        left: -40,
        width: 150,
        height: 150,
        borderRadius: 75,
        backgroundColor: 'rgba(108, 99, 255, 0.08)',
    },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: 26,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 22,
        alignItems: 'center',
        ...SHADOWS.medium,
    },
    iconBorder: {
        width: 74,
        height: 74,
        borderRadius: 37,
        padding: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconInner: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: COLORS.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    icon: {
        fontSize: 28,
    },
    title: {
        color: COLORS.textPrimary,
        fontSize: 26,
        fontWeight: '800',
        textAlign: 'center',
    },
    subtitle: {
        color: COLORS.textSecondary,
        textAlign: 'center',
        fontSize: 14,
        lineHeight: 20,
        marginTop: 10,
        marginBottom: 18,
    },
    inputGroup: {
        width: '100%',
        marginBottom: 12,
    },
    inputLabel: {
        color: COLORS.textLabel,
        fontSize: 12,
        fontWeight: '700',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: COLORS.border,
        backgroundColor: COLORS.surfaceLight,
        borderRadius: SIZES.radiusLg,
        paddingHorizontal: 14,
        minHeight: SIZES.inputHeight,
    },
    inputWrapperFocused: {
        borderColor: COLORS.borderFocused,
        backgroundColor: '#203647',
    },
    inputIcon: {
        fontSize: 18,
        marginRight: 10,
    },
    input: {
        flex: 1,
        color: COLORS.textPrimary,
        fontSize: 15,
        paddingVertical: 14,
    },
    note: {
        color: COLORS.textSecondary,
        fontSize: 13,
        lineHeight: 19,
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 18,
    },
    primaryButton: {
        width: '100%',
        height: SIZES.buttonHeight,
        borderRadius: SIZES.radiusLg,
        justifyContent: 'center',
        alignItems: 'center',
    },
    primaryButtonDisabled: {
        opacity: 0.7,
    },
    primaryButtonText: {
        color: COLORS.textPrimary,
        fontSize: 16,
        fontWeight: '800',
    },
    secondaryButton: {
        marginTop: 12,
        paddingVertical: 8,
        alignItems: 'center',
    },
    secondaryButtonText: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: '700',
    },
    toggleText: {
        fontSize: 18,
        color: COLORS.textSecondary,
    },
    backButton: {
        marginTop: 14,
        paddingVertical: 8,
        paddingHorizontal: 14,
    },
    backButtonText: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: '700',
    },
});

export default ForgotPasswordScreen;