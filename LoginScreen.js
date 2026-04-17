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
    Platform,
    Animated,
    Dimensions,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_HEIGHT = 220; // Fixed height taaki flicker na ho

const LoginScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [emailFocused, setEmailFocused] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);

    // Animations
    const headerFade = useRef(new Animated.Value(0)).current;
    const formSlide = useRef(new Animated.Value(40)).current;
    const formFade = useRef(new Animated.Value(0)).current;
    const buttonScale = useRef(new Animated.Value(1)).current;
    const hasAnimated = useRef(false);

    useEffect(() => {
        if (hasAnimated.current) return;

        Animated.sequence([
            Animated.timing(headerFade, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.parallel([
                Animated.timing(formSlide, {
                    toValue: 0,
                    duration: 500,
                    useNativeDriver: true,
                }),
                Animated.timing(formFade, {
                    toValue: 1,
                    duration: 500,
                    useNativeDriver: true,
                }),
            ]),
        ]).start(() => {
            hasAnimated.current = true;
        });
    }, []);

    const handleLogin = () => {
        if (!email.trim() || !password.trim()) {
            Alert.alert('Missing Fields', 'Please enter both email and password.');
            return;
        }
        setLoading(true);

        Animated.sequence([
            Animated.timing(buttonScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
            Animated.timing(buttonScale, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]).start();

        setTimeout(() => {
            setLoading(false);
            if (email.toLowerCase() === 'test@test.com' && password === '123456') {
                navigation.replace('Questionnaire');
            } else {
                Alert.alert('🔐 Demo Credentials', 'Email: test@test.com\nPassword: 123456');
            }
        }, 1500);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0F2027" />

            {/* --- FIXED HEADER SECTION --- */}
            <LinearGradient
                colors={['#0F2027', '#203A43', '#2C5364']}
                style={styles.topSection}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.decorCircle1} />
                <View style={styles.decorCircle2} />

                <Animated.View style={[styles.headerContent, { opacity: headerFade }]}>
                    <View style={styles.miniLogoContainer}>
                        <LinearGradient
                            colors={['#00D2FF', '#3A7BD5', '#6C63FF']}
                            style={styles.miniLogoBorder}
                        >
                            <View style={styles.miniLogoInner}>
                                <Text style={styles.miniLogoIcon}>🦴</Text>
                            </View>
                        </LinearGradient>
                    </View>
                    <Text style={styles.welcomeText}>Welcome Back</Text>
                    <Text style={styles.welcomeSubtext}>Sign in to continue your analysis</Text>
                </Animated.View>
            </LinearGradient>

            {/* --- SCROLLABLE FORM SECTION --- */}
            <ScrollView
                style={StyleSheet.absoluteFill} // Poori screen cover karega par header iske upar rahega
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                bounces={false}
                overScrollMode="never"
            >
                <Animated.View
                    style={[
                        styles.formContainer,
                        {
                            opacity: formFade,
                            transform: [{ translateY: formSlide }],
                        },
                    ]}
                >
                    {/* Email Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Email Address</Text>
                        <View style={[styles.inputWrapper, emailFocused && styles.inputWrapperFocused]}>
                            <Text style={styles.inputIcon}>✉️</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your email"
                                placeholderTextColor="#8a9bb5"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                onFocus={() => setEmailFocused(true)}
                                onBlur={() => setEmailFocused(false)}
                            />
                        </View>
                    </View>

                    {/* Password Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.inputLabel}>Password</Text>
                        <View style={[styles.inputWrapper, passwordFocused && styles.inputWrapperFocused]}>
                            <Text style={styles.inputIcon}>🔒</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Enter your password"
                                placeholderTextColor="#8a9bb5"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry={!showPassword}
                                onFocus={() => setPasswordFocused(true)}
                                onBlur={() => setPasswordFocused(false)}
                            />
                            <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeButton}>
                                <Text style={styles.eyeIcon}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <TouchableOpacity style={styles.forgotButton}>
                        <Text style={styles.forgotText}>Forgot Password?</Text>
                    </TouchableOpacity>

                    {/* Login Button */}
                    <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                        <TouchableOpacity onPress={handleLogin} disabled={loading} activeOpacity={0.8}>
                            <LinearGradient
                                colors={loading ? ['#4a5568', '#4a5568'] : ['#00D2FF', '#3A7BD5', '#6C63FF']}
                                style={styles.loginButton}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                {loading ? (
                                    <View style={styles.loadingRow}>
                                        <ActivityIndicator color="#fff" size="small" />
                                        <Text style={styles.loginButtonText}>  Signing in...</Text>
                                    </View>
                                ) : (
                                    <Text style={styles.loginButtonText}>Sign In</Text>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>

                    <View style={styles.dividerRow}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>or continue with</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    <View style={styles.socialRow}>
                        {['G', 'f', '🍎'].map((icon, index) => (
                            <TouchableOpacity key={index} style={styles.socialButton}>
                                <Text style={styles.socialIcon}>{icon}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={styles.signupRow}>
                        <Text style={styles.signupText}>Don't have an account? </Text>
                        <TouchableOpacity>
                            <Text style={styles.signupLink}>Sign Up</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F1923',
    },
    topSection: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: HEADER_HEIGHT,
        zIndex: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        elevation: 5,
    },
    scrollContent: {
        paddingTop: HEADER_HEIGHT + 20, // Content header ke neeche se shuru hoga
        paddingHorizontal: 24,
        paddingBottom: 40,
    },
    decorCircle1: {
        position: 'absolute',
        top: -30,
        right: -30,
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(0, 210, 255, 0.08)',
    },
    decorCircle2: {
        position: 'absolute',
        top: 40,
        left: -20,
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(108, 99, 255, 0.08)',
    },
    headerContent: {
        alignItems: 'center',
        marginTop: 20,
    },
    miniLogoContainer: {
        marginBottom: 10,
    },
    miniLogoBorder: {
        width: 60,
        height: 60,
        borderRadius: 30,
        padding: 2,
        justifyContent: 'center',
        alignItems: 'center',
    },
    miniLogoInner: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#1a2a3a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    miniLogoIcon: { fontSize: 26 },
    welcomeText: {
        fontSize: 26,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    welcomeSubtext: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.6)',
        marginTop: 4,
    },
    formContainer: {
        flex: 1,
    },
    inputGroup: { marginBottom: 18 },
    inputLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#8a9bb5',
        marginBottom: 8,
        textTransform: 'uppercase',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1a2a3a',
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#2a3a4a',
        paddingHorizontal: 16,
        height: 54,
    },
    inputWrapperFocused: {
        borderColor: '#00D2FF',
        backgroundColor: '#1e3040',
    },
    inputIcon: { fontSize: 18, marginRight: 12 },
    input: { flex: 1, fontSize: 16, color: '#FFFFFF' },
    eyeButton: { padding: 4 },
    eyeIcon: { fontSize: 18 },
    forgotButton: { alignSelf: 'flex-end', marginBottom: 20 },
    forgotText: { color: '#00D2FF', fontSize: 13, fontWeight: '600' },
    loginButton: {
        height: 54,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loginButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
    loadingRow: { flexDirection: 'row', alignItems: 'center' },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 24,
    },
    dividerLine: { flex: 1, height: 1, backgroundColor: '#2a3a4a' },
    dividerText: { color: '#5a6b7d', fontSize: 12, marginHorizontal: 12 },
    socialRow: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginBottom: 24 },
    socialButton: {
        width: 50,
        height: 50,
        borderRadius: 12,
        backgroundColor: '#1a2a3a',
        borderWidth: 1,
        borderColor: '#2a3a4a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    socialIcon: { fontSize: 20, color: '#FFFFFF', fontWeight: '700' },
    signupRow: { flexDirection: 'row', justifyContent: 'center' },
    signupText: { color: '#5a6b7d', fontSize: 14 },
    signupLink: { color: '#00D2FF', fontSize: 14, fontWeight: '700' },
});

export default LoginScreen;