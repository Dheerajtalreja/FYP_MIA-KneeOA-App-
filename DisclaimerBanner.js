// ─── Disclaimer Banner Component ───────────────────────────────
// Shows a prominent medical disclaimer on result/advice screens.
// Required on all diagnostic and recommendation screens.

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../constants/theme';

const DisclaimerBanner = ({ style, compact = false }) => {
    if (compact) {
        return (
            <View style={[styles.compactContainer, style]}>
                <Text style={styles.compactIcon}>⚠️</Text>
                <Text style={styles.compactText}>
                    For informational purposes only — not a medical diagnosis.
                    Always consult a qualified healthcare professional.
                </Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, style]}>
            <View style={styles.headerRow}>
                <Text style={styles.icon}>⚕️</Text>
                <Text style={styles.title}>Medical Disclaimer</Text>
            </View>
            <Text style={styles.text}>
                This application provides AI-assisted analysis for informational and
                educational purposes only. It does{' '}
                <Text style={styles.bold}>NOT</Text> constitute medical advice, diagnosis,
                or treatment. Results should be reviewed by a qualified healthcare
                professional before any clinical decisions are made.
            </Text>
            <Text style={styles.subtext}>
                Always seek the advice of your physician or other qualified health
                provider with any questions regarding a medical condition.
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: COLORS.disclaimerBg,
        borderWidth: 1,
        borderColor: COLORS.disclaimerBorder,
        borderRadius: 14,
        padding: 16,
        marginVertical: 12,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    icon: {
        fontSize: 20,
        marginRight: 8,
    },
    title: {
        fontSize: 15,
        fontWeight: '700',
        color: COLORS.disclaimerText,
    },
    text: {
        fontSize: 13,
        color: COLORS.disclaimerText,
        lineHeight: 20,
        marginBottom: 8,
    },
    bold: {
        fontWeight: '800',
    },
    subtext: {
        fontSize: 12,
        color: 'rgba(255, 138, 128, 0.7)',
        lineHeight: 18,
        fontStyle: 'italic',
    },
    // Compact variant
    compactContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.disclaimerBg,
        borderWidth: 1,
        borderColor: COLORS.disclaimerBorder,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginVertical: 8,
    },
    compactIcon: {
        fontSize: 14,
        marginRight: 8,
    },
    compactText: {
        flex: 1,
        fontSize: 11,
        color: COLORS.disclaimerText,
        lineHeight: 16,
    },
});

export default DisclaimerBanner;
