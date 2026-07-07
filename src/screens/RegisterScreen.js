import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    StatusBar,
    Alert,
    Animated,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { registerUser } from '../services/api';
import { COLORS, SHADOWS, SIZES } from '../config/theme';
import { saveUser } from '../services/database';

const RegisterScreen = ({ navigation }) => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState('patient');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [focusedField, setFocusedField] = useState(null);

    const headerFade = useRef(new Animated.Value(0)).current;
    const formSlide = useRef(new Animated.Value(28)).current;
    const formFade = useRef(new Animated.Value(0)).current;
    const buttonScale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.timing(headerFade, {
                toValue: 1,
                duration: 450,
                useNativeDriver: true,
            }),
            Animated.parallel([
                Animated.timing(formSlide, {
                    toValue: 0,
                    duration: 450,
                    useNativeDriver: true,
                }),
                Animated.timing(formFade, {
                    toValue: 1,
                    duration: 450,
                    useNativeDriver: true,
                }),
            ]),
        ]).start();

        // CRITICAL: Cleanup animations on unmount to prevent ghost animation crashes
        return () => {
            headerFade.stopAnimation();
            formSlide.stopAnimation();
            formFade.stopAnimation();
            buttonScale.stopAnimation();
        };
    }, []);

    const handleRegister = async () => {
        if (!fullName.trim() || !email.trim() || !password.trim()) {
            Alert.alert('Missing fields', 'Please complete your name, email, and password.');
            return;
        }

        if (password !== confirmPassword) {
            Alert.alert('Password mismatch', 'Your password confirmation does not match.');
            return;
        }

        setLoading(true);

        Animated.sequence([
            Animated.timing(buttonScale, {
                toValue: 0.96,
                duration: 100,
                useNativeDriver: true,
            }),
            Animated.timing(buttonScale, {
                toValue: 1,
                duration: 120,
                useNativeDriver: true,
            }),
        ]).start();

        try {
            // CRITICAL: Only call POST /api/v1/auth/register with { email, password, full_name }
            await registerUser({
                full_name: fullName.trim(),
                email: email.trim().toLowerCase(),
                password,
                role,
            });

            // CRITICAL: Save user to local database immediately
            const userId = email.trim().toLowerCase();
            await saveUser({
                id: null,
                email: email.trim().toLowerCase(),
                fullName: fullName.trim(),
                role: 'patient',
                profile: { new_user: true },
            });

            // CRITICAL: Navigate directly to QuestionnaireScreen (no profile sync)
            Alert.alert(
                'Account Created',
                'Welcome! Please complete your medical profile to get started.',
                [
                    {
                        text: 'Continue',
                        onPress: () => navigation.replace('Questionnaire'),
                    },
                ]
            );
        } catch (error) {
            navigation.navigate('Error', {
                title: 'Registration failed',
                message: error.message || 'We could not create your account right now.',
                retryRoute: 'Register',
                retryLabel: 'Try Register Again',
            });
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = (name) => [styles.inputWrapper, focusedField === name && styles.inputWrapperFocused];

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.gradientStart} />

            <LinearGradient
                colors={COLORS.headerGradient}
                style={styles.hero}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.decorCircleOne} />
                <View style={styles.decorCircleTwo} />
                <Animated.View style={[styles.heroContent, { opacity: headerFade }]}>
                    <LinearGradient
                        colors={COLORS.fullPrimaryGradient}
                        style={styles.logoBorder}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <View style={styles.logoInner}>
                            <Text style={styles.logoIcon}>🦴</Text>
                        </View>
                    </LinearGradient>
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>Join KneeOA Engine and start your analysis journey</Text>
                </Animated.View>
            </LinearGradient>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    <Animated.View style={[styles.formCard, { opacity: formFade, transform: [{ translateY: formSlide }] }]}>
                        <View style={styles.roleRow}>
                            {[
                                { key: 'patient', label: 'Patient' },
                                { key: 'gp', label: 'GP' },
                            ].map((item) => (
                                <TouchableOpacity
                                    key={item.key}
                                    style={[styles.roleChip, role === item.key && styles.roleChipActive]}
                                    onPress={() => setRole(item.key)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[styles.roleChipText, role === item.key && styles.roleChipTextActive]}>
                                        {item.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Full Name</Text>
                            <View style={inputStyle('fullName')}>
                                <Text style={styles.inputIcon}>👤</Text>
                                <TextInput
                                    value={fullName}
                                    onChangeText={setFullName}
                                    placeholder="Enter your full name"
                                    placeholderTextColor={COLORS.placeholder}
                                    style={styles.input}
                                    onFocus={() => setFocusedField('fullName')}
                                    onBlur={() => setFocusedField(null)}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Email Address</Text>
                            <View style={inputStyle('email')}>
                                <Text style={styles.inputIcon}>✉️</Text>
                                <TextInput
                                    value={email}
                                    onChangeText={setEmail}
                                    placeholder="Enter your email"
                                    placeholderTextColor={COLORS.placeholder}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                    style={styles.input}
                                    onFocus={() => setFocusedField('email')}
                                    onBlur={() => setFocusedField(null)}
                                />
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Password</Text>
                            <View style={inputStyle('password')}>
                                <Text style={styles.inputIcon}>🔒</Text>
                                <TextInput
                                    value={password}
                                    onChangeText={setPassword}
                                    placeholder="Create a password"
                                    placeholderTextColor={COLORS.placeholder}
                                    secureTextEntry={!showPassword}
                                    style={styles.input}
                                    onFocus={() => setFocusedField('password')}
                                    onBlur={() => setFocusedField(null)}
                                />
                                <TouchableOpacity onPress={() => setShowPassword((value) => !value)} style={styles.eyeButton}>
                                    <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Confirm Password</Text>
                            <View style={inputStyle('confirmPassword')}>
                                <Text style={styles.inputIcon}>🔐</Text>
                                <TextInput
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    placeholder="Re-enter your password"
                                    placeholderTextColor={COLORS.placeholder}
                                    secureTextEntry={!showConfirmPassword}
                                    style={styles.input}
                                    onFocus={() => setFocusedField('confirmPassword')}
                                    onBlur={() => setFocusedField(null)}
                                />
                                <TouchableOpacity
                                    onPress={() => setShowConfirmPassword((value) => !value)}
                                    style={styles.eyeButton}
                                >
                                    <Text style={styles.eyeIcon}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                            <TouchableOpacity onPress={handleRegister} activeOpacity={0.85} disabled={loading}>
                                <LinearGradient
                                    colors={loading ? ['#4a5568', '#4a5568'] : COLORS.fullPrimaryGradient}
                                    style={styles.primaryButton}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    {loading ? (
                                        <View style={styles.loadingRow}>
                                            <ActivityIndicator color="#FFFFFF" size="small" />
                                            <Text style={styles.primaryButtonText}>  Creating account...</Text>
                                        </View>
                                    ) : (
                                        <Text style={styles.primaryButtonText}>Create Account</Text>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </Animated.View>

                        <View style={styles.footerRow}>
                            <Text style={styles.footerText}>Already have an account? </Text>
                            <TouchableOpacity onPress={() => navigation.replace('Login')}>
                                <Text style={styles.footerLink}>Sign In</Text>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    flex: {
        flex: 1,
    },
    hero: {
        height: 250,
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroContent: {
        alignItems: 'center',
        paddingHorizontal: SIZES.lg,
    },
    decorCircleOne: {
        position: 'absolute',
        top: -30,
        right: -30,
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(0, 210, 255, 0.08)',
    },
    decorCircleTwo: {
        position: 'absolute',
        top: 30,
        left: -20,
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: 'rgba(108, 99, 255, 0.08)',
    },
    logoBorder: {
        width: 68,
        height: 68,
        borderRadius: 34,
        padding: 2,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 14,
    },
    logoInner: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: COLORS.surface,
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoIcon: {
        fontSize: 28,
    },
    title: {
        color: COLORS.textPrimary,
        fontSize: 28,
        fontWeight: '800',
        letterSpacing: 0.4,
        textAlign: 'center',
    },
    subtitle: {
        color: COLORS.textSecondary,
        fontSize: 13,
        textAlign: 'center',
        marginTop: 6,
        lineHeight: 18,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 22,
        paddingBottom: 40,
    },
    formCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        ...SHADOWS.medium,
    },
    roleRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 18,
    },
    roleChip: {
        flex: 1,
        borderRadius: 999,
        paddingVertical: 11,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        backgroundColor: COLORS.surfaceLight,
    },
    roleChipActive: {
        backgroundColor: 'rgba(0, 210, 255, 0.12)',
        borderColor: COLORS.borderFocused,
    },
    roleChipText: {
        color: COLORS.textSecondary,
        fontSize: 13,
        fontWeight: '700',
    },
    roleChipTextActive: {
        color: COLORS.textPrimary,
    },
    inputGroup: {
        marginBottom: 16,
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
        minHeight: SIZES.inputHeight - 2,
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
    eyeButton: {
        padding: 6,
    },
    eyeIcon: {
        fontSize: 17,
    },
    primaryButton: {
        height: SIZES.buttonHeight,
        borderRadius: SIZES.radiusLg,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 4,
    },
    primaryButtonText: {
        color: COLORS.textPrimary,
        fontSize: 16,
        fontWeight: '800',
    },
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        marginTop: 18,
        flexWrap: 'wrap',
    },
    footerText: {
        color: COLORS.textSecondary,
        fontSize: 14,
    },
    footerLink: {
        color: COLORS.primary,
        fontSize: 14,
        fontWeight: '800',
    },
});

export default RegisterScreen;
