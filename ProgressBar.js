// ─── Progress Bar Component ────────────────────────────────────
// Multi-step progress indicator for the Questionnaire flow.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '../constants/theme';

const ProgressBar = ({ currentStep, totalSteps, labels = [] }) => {
    const progress = currentStep / totalSteps;

    return (
        <View style={styles.container}>
            <View style={styles.labelRow}>
                <Text style={styles.stepText}>
                    Step {currentStep} of {totalSteps}
                </Text>
                {labels[currentStep - 1] && (
                    <Text style={styles.stepLabel}>{labels[currentStep - 1]}</Text>
                )}
            </View>
            <View style={styles.track}>
                <LinearGradient
                    colors={COLORS.fullPrimaryGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.fill, { width: `${progress * 100}%` }]}
                />
            </View>
            <View style={styles.dotsRow}>
                {Array.from({ length: totalSteps }, (_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.dot,
                            i < currentStep && styles.dotCompleted,
                            i === currentStep - 1 && styles.dotActive,
                        ]}
                    />
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    stepText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.primary,
    },
    stepLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: COLORS.textSecondary,
    },
    track: {
        height: 6,
        backgroundColor: COLORS.border,
        borderRadius: 3,
        overflow: 'hidden',
    },
    fill: {
        height: '100%',
        borderRadius: 3,
    },
    dotsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
        paddingHorizontal: 2,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.border,
    },
    dotCompleted: {
        backgroundColor: COLORS.primary,
    },
    dotActive: {
        backgroundColor: COLORS.accent,
        shadowColor: COLORS.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 6,
        elevation: 4,
    },
});

export default ProgressBar;
