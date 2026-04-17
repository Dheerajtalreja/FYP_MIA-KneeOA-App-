import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Animated,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES } from '../constants/theme';
import ProgressBar from '../components/ProgressBar';
import { saveQuestionnaireResponse } from '../services/database';

const { width } = Dimensions.get('window');

const TOTAL_STEPS = 4;
const STEP_LABELS = ['Basic Info', 'Pain Assessment', 'Mobility', 'History'];

const QuestionnaireScreen = ({ navigation }) => {
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        age: 50,
        gender: 'male',
        weight: 75,
        height: 170,
        painLevel: 3,
        painLocation: 'both',
        painDuration: 'months',
        mobilityScore: 5,
        canBendFully: true,
        canClimbStairs: true,
        canWalk30Min: false,
        previousInjuries: 'none',
        surgeries: 'none',
        medications: 'ibuprofen',
        familyHistory: false,
        additionalNotes: '',
    });

    // Animations
    const slideAnim = useRef(new Animated.Value(0)).current;
    const fadeAnim = useRef(new Animated.Value(1)).current;

    const navigateStep = (direction) => {
        const newStep = currentStep + direction;
        if (newStep < 1 || newStep > TOTAL_STEPS) return;

        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: direction > 0 ? -30 : 30,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            setCurrentStep(newStep);
            slideAnim.setValue(direction > 0 ? 30 : -30);
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(slideAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();
        });
    };

    const handleComplete = async () => {
        setLoading(true);
        try {
            await saveQuestionnaireResponse({ ...formData, userId: 'user_123' });
            // In a real app, this might upload right away. For offline-first, sync handles it later.
            navigation.replace('Home');
        } catch (error) {
            console.error('Failed to save questionnaire:', error);
        } finally {
            setLoading(false);
        }
    };

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>Basic Information</Text>
                        <Text style={styles.stepDescription}>
                            Help us tailor the analysis and recommendations to your profile.
                        </Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Age</Text>
                            <View style={styles.numberStepper}>
                                <TouchableOpacity
                                    style={styles.stepperBtn}
                                    onPress={() => setFormData(p => ({ ...p, age: Math.max(18, p.age - 1) }))}>
                                    <Text style={styles.stepperBtnText}>-</Text>
                                </TouchableOpacity>
                                <Text style={styles.stepperValue}>{formData.age}</Text>
                                <TouchableOpacity
                                    style={styles.stepperBtn}
                                    onPress={() => setFormData(p => ({ ...p, age: Math.min(120, p.age + 1) }))}>
                                    <Text style={styles.stepperBtnText}>+</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Biological Sex</Text>
                            <View style={styles.toggleRow}>
                                {['male', 'female'].map((g) => (
                                    <TouchableOpacity
                                        key={g}
                                        style={[
                                            styles.toggleBtn,
                                            formData.gender === g && styles.toggleBtnActive
                                        ]}
                                        onPress={() => setFormData({ ...formData, gender: g })}
                                    >
                                        <Text style={[
                                            styles.toggleBtnText,
                                            formData.gender === g && styles.toggleBtnTextActive
                                        ]}>
                                            {g.charAt(0).toUpperCase() + g.slice(1)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    </View>
                );
            case 2:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>Pain Assessment</Text>
                        <Text style={styles.stepDescription}>
                            Rate your current knee pain level from 0 (none) to 10 (severe).
                        </Text>
                        <Text style={styles.painValue}>{formData.painLevel}/10</Text>
                        <View style={styles.sliderMock}>
                            {/* In a real app, use @react-native-community/slider */}
                            <View style={styles.sliderTrack}>
                                <View style={[styles.sliderFill, { width: `${(formData.painLevel / 10) * 100}%` }]} />
                            </View>
                            <View style={styles.sliderControls}>
                                <TouchableOpacity onPress={() => setFormData(p => ({ ...p, painLevel: Math.max(0, p.painLevel - 1) }))}><Text style={styles.sliderBtn}>-</Text></TouchableOpacity>
                                <TouchableOpacity onPress={() => setFormData(p => ({ ...p, painLevel: Math.min(10, p.painLevel + 1) }))}><Text style={styles.sliderBtn}>+</Text></TouchableOpacity>
                            </View>
                        </View>

                        <Text style={styles.label}>Pain Location</Text>
                        <View style={styles.toggleRow}>
                            {['left', 'right', 'both'].map((loc) => (
                                <TouchableOpacity
                                    key={loc}
                                    style={[
                                        styles.toggleBtn,
                                        formData.painLocation === loc && styles.toggleBtnActive
                                    ]}
                                    onPress={() => setFormData({ ...formData, painLocation: loc })}
                                >
                                    <Text style={[
                                        styles.toggleBtnText,
                                        formData.painLocation === loc && styles.toggleBtnTextActive
                                    ]}>
                                        {loc.charAt(0).toUpperCase() + loc.slice(1)}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                );
            case 3:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>Mobility Capabilities</Text>
                        <Text style={styles.stepDescription}>
                            Can you perform the following activities without severe discomfort?
                        </Text>

                        {[
                            { key: 'canBendFully', label: 'Bend knee fully' },
                            { key: 'canClimbStairs', label: 'Climb a flight of stairs' },
                            { key: 'canWalk30Min', label: 'Walk for 30 minutes' }
                        ].map((item) => (
                            <View key={item.key} style={styles.switchRow}>
                                <Text style={styles.switchLabel}>{item.label}</Text>
                                <View style={styles.toggleRowSmall}>
                                    <TouchableOpacity
                                        style={[styles.toggleBtnSmall, formData[item.key] && styles.toggleBtnSmallActive]}
                                        onPress={() => setFormData({ ...formData, [item.key]: true })}
                                    ><Text style={[styles.toggleBtnSmallText, formData[item.key] && styles.toggleBtnSmallTextActive]}>Yes</Text></TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.toggleBtnSmall, !formData[item.key] && styles.toggleBtnSmallActive]}
                                        onPress={() => setFormData({ ...formData, [item.key]: false })}
                                    ><Text style={[styles.toggleBtnSmallText, !formData[item.key] && styles.toggleBtnSmallTextActive]}>No</Text></TouchableOpacity>
                                </View>
                            </View>
                        ))}
                    </View>
                );
            case 4:
                return (
                    <View style={styles.stepContainer}>
                        <Text style={styles.stepTitle}>Medical History</Text>
                        <Text style={styles.stepDescription}>
                            Any previous conditions we should be aware of?
                        </Text>

                        <View style={styles.switchRow}>
                            <Text style={styles.switchLabel}>Family History of OA?</Text>
                            <View style={styles.toggleRowSmall}>
                                <TouchableOpacity
                                    style={[styles.toggleBtnSmall, formData.familyHistory && styles.toggleBtnSmallActive]}
                                    onPress={() => setFormData({ ...formData, familyHistory: true })}
                                ><Text style={[styles.toggleBtnSmallText, formData.familyHistory && styles.toggleBtnSmallTextActive]}>Yes</Text></TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.toggleBtnSmall, !formData.familyHistory && styles.toggleBtnSmallActive]}
                                    onPress={() => setFormData({ ...formData, familyHistory: false })}
                                ><Text style={[styles.toggleBtnSmallText, !formData.familyHistory && styles.toggleBtnSmallTextActive]}>No</Text></TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.disclaimerBox}>
                            <Text style={styles.disclaimerText}>
                                Your data is stored securely and encrypted. It will be used to provide personalized recommendations alongside your scan analysis.
                            </Text>
                        </View>
                    </View>
                );
            default:
                return null;
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Patient Profile</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <ProgressBar
                    currentStep={currentStep}
                    totalSteps={TOTAL_STEPS}
                    labels={STEP_LABELS}
                />

                <Animated.View
                    style={[
                        styles.animatedContainer,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateX: slideAnim }],
                        },
                    ]}
                >
                    {renderStepContent()}
                </Animated.View>
            </ScrollView>

            <View style={styles.footer}>
                {currentStep > 1 ? (
                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => navigateStep(-1)}
                    >
                        <Text style={styles.secondaryButtonText}>Back</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={{ flex: 1 }} />
                )}

                {currentStep < TOTAL_STEPS ? (
                    <TouchableOpacity
                        style={styles.primaryButtonWrapper}
                        onPress={() => navigateStep(1)}
                    >
                        <LinearGradient
                            colors={COLORS.primaryGradient}
                            style={styles.primaryButton}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Text style={styles.primaryButtonText}>Next</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={styles.primaryButtonWrapper}
                        onPress={handleComplete}
                        disabled={loading}
                    >
                        <LinearGradient
                            colors={COLORS.successGradient}
                            style={styles.primaryButton}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Text style={styles.primaryButtonText}>
                                {loading ? 'Saving...' : 'Complete Profile'}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: Platform.OS === 'ios' ? 60 : 40,
        paddingBottom: 20,
        paddingHorizontal: 20,
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    backButton: {
        padding: 8,
    },
    backButtonText: {
        color: COLORS.textPrimary,
        fontSize: 24,
    },
    headerTitle: {
        color: COLORS.textPrimary,
        fontSize: 18,
        fontWeight: 'bold',
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 100,
    },
    animatedContainer: {
        flex: 1,
    },
    stepContainer: {
        backgroundColor: COLORS.surface,
        borderRadius: SIZES.radiusLg,
        padding: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    stepTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: 8,
    },
    stepDescription: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 24,
        lineHeight: 20,
    },
    inputGroup: {
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginBottom: 12,
        fontWeight: '600',
    },
    numberStepper: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.surfaceLight,
        borderRadius: SIZES.radiusMd,
        height: 60,
    },
    stepperBtn: {
        paddingVertical: 10,
        paddingHorizontal: 30,
    },
    stepperBtnText: {
        color: COLORS.primary,
        fontSize: 24,
        fontWeight: 'bold',
    },
    stepperValue: {
        color: COLORS.textPrimary,
        fontSize: 24,
        fontWeight: 'bold',
        width: 60,
        textAlign: 'center',
    },
    toggleRow: {
        flexDirection: 'row',
        gap: 10,
    },
    toggleBtn: {
        flex: 1,
        height: 50,
        borderRadius: SIZES.radiusMd,
        backgroundColor: COLORS.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    toggleBtnActive: {
        borderColor: COLORS.primary,
        backgroundColor: 'rgba(0, 210, 255, 0.1)',
    },
    toggleBtnText: {
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    toggleBtnTextActive: {
        color: COLORS.primary,
    },
    sliderMock: {
        marginBottom: 30,
    },
    painValue: {
        color: COLORS.accent,
        fontSize: 36,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
    },
    sliderTrack: {
        height: 8,
        backgroundColor: COLORS.surfaceLight,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 15,
    },
    sliderFill: {
        height: '100%',
        backgroundColor: COLORS.accent,
    },
    sliderControls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
    },
    sliderBtn: {
        color: COLORS.primary,
        fontSize: 28,
        paddingHorizontal: 20,
    },
    switchRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    switchLabel: {
        color: COLORS.textPrimary,
        fontSize: 16,
        flex: 1,
        paddingRight: 15,
    },
    toggleRowSmall: {
        flexDirection: 'row',
        backgroundColor: COLORS.surfaceLight,
        borderRadius: SIZES.radiusSm,
        padding: 4,
    },
    toggleBtnSmall: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: SIZES.radiusSm - 2,
    },
    toggleBtnSmallActive: {
        backgroundColor: COLORS.surface,
        ...COLORS.shadows,
    },
    toggleBtnSmallText: {
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    toggleBtnSmallTextActive: {
        color: COLORS.primary,
    },
    disclaimerBox: {
        backgroundColor: 'rgba(58, 123, 213, 0.1)',
        padding: 15,
        borderRadius: SIZES.radiusMd,
        borderLeftWidth: 4,
        borderLeftColor: COLORS.primary,
    },
    disclaimerText: {
        color: COLORS.textSecondary,
        fontSize: 13,
        lineHeight: 18,
    },
    footer: {
        flexDirection: 'row',
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
        gap: 15,
    },
    secondaryButton: {
        flex: 1,
        height: SIZES.buttonHeight,
        borderRadius: SIZES.radiusMd,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    secondaryButtonText: {
        color: COLORS.textPrimary,
        fontSize: 16,
        fontWeight: '600',
    },
    primaryButtonWrapper: {
        flex: 2,
    },
    primaryButton: {
        height: SIZES.buttonHeight,
        borderRadius: SIZES.radiusMd,
        justifyContent: 'center',
        alignItems: 'center',
    },
    primaryButtonText: {
        color: COLORS.textPrimary,
        fontSize: 16,
        fontWeight: 'bold',
    },
});

export default QuestionnaireScreen;
