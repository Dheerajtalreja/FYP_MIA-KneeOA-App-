import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Image,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, getKLGradeColor, getKLGradeLabel } from '../config/theme';
import DisclaimerBanner from '../components/DisclaimerBanner';

const ResultScreen = ({ navigation, route }) => {
    const { imageUri, kneeSide, analysis, scanId, questionnaireId, clinicalProfile } = route.params || {};

    const grade = analysis?.klGrade ?? analysis?.kl_grade;
    const normalizedGrade = Number.isFinite(Number(grade)) ? Number(grade) : null;
    const gradeColor = normalizedGrade !== null ? getKLGradeColor(normalizedGrade) : COLORS.textMuted;
    const hasValidGrade = normalizedGrade !== null;
    const medications = Array.isArray(analysis?.medications) ? analysis.medications : [];

    const formatMedicationValue = (value) => {
        if (value === null || value === undefined || String(value).trim().length === 0) {
            return '-';
        }
        return String(value);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => {
                    if (navigation.canGoBack()) {
                        navigation.goBack();
                    } else {
                        navigation.replace('Home');
                    }
                }}>
                    <Text style={styles.backButtonText}>✕</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Analysis Result</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                
                <View style={styles.imageCard}>
                    {imageUri ? (
                         <Image source={{ uri: imageUri }} style={styles.resultImage} />
                    ) : (
                        <View style={styles.resultImagePlaceholder}>
                            <Text style={{color: COLORS.textSecondary}}>No Image Provided</Text>
                        </View>
                    )}
                    {/* Fake Annotations Overlay Layer */}
                    {hasValidGrade ? (
                        <View style={styles.annotationOverlay}>
                            <View style={[styles.boundingRectangle, { borderColor: gradeColor }]} />
                        </View>
                    ) : null}
                </View>

                <View style={styles.gradeCard}>
                    <Text style={styles.cardTitle}>Kellgren-Lawrence Grade</Text>
                    <View style={styles.gradeRow}>
                        <View style={[styles.gradeCircle, { backgroundColor: `${gradeColor}20`, borderColor: gradeColor }]}>
                            <Text style={[styles.gradeNumber, { color: gradeColor }]}>
                                {hasValidGrade ? normalizedGrade : '?'}
                            </Text>
                        </View>
                        <View style={styles.gradeTextContainer}>
                            <Text style={styles.gradeLabel}>
                                {hasValidGrade ? `${getKLGradeLabel(normalizedGrade)} OA` : 'Unable to determine'}
                            </Text>
                            <Text style={styles.gradeSide}>{kneeSide ? kneeSide.toUpperCase() : 'UNKNOWN'} KNEE</Text>
                        </View>
                    </View>
                    <Text style={styles.analysisDetails}>
                        {analysis?.diagnosisSummary || analysis?.details || 'No further details available.'}
                    </Text>
                    {analysis?.recommendation ? (
                        <Text style={[styles.analysisDetails, { marginTop: 12 }]}>
                            {analysis.recommendation}
                        </Text>
                    ) : null}
                </View>

                <View style={styles.medicationSection}>
                    <Text style={styles.sectionTitle}>Recommended Medications</Text>
                    <View style={styles.card}>
                        {medications.length === 0 ? (
                            <Text style={styles.emptyText}>No medications recommended.</Text>
                        ) : (
                            medications.map((medication) => (
                                <View key={medication?.id ?? String(Math.random())} style={styles.medicationCard}>
                                    <Text style={styles.medicationTitle}>💊 {formatMedicationValue(medication?.name)}</Text>
                                    <Text style={styles.medicationLabel}>Dosage</Text>
                                    <Text style={styles.medicationValue}>{formatMedicationValue(medication?.dosage)}</Text>
                                    <Text style={styles.medicationLabel}>Frequency</Text>
                                    <Text style={styles.medicationValue}>{formatMedicationValue(medication?.frequency)}</Text>
                                    <Text style={styles.medicationLabel}>Instructions</Text>
                                    <Text style={styles.medicationValue}>{formatMedicationValue(medication?.instructions)}</Text>
                                    <Text style={styles.medicationLabel}>Contraindications</Text>
                                    <Text style={styles.medicationValue}>{formatMedicationValue(medication?.contraindications)}</Text>
                                </View>
                            ))
                        )}
                    </View>
                </View>

                <View style={styles.actionContainer}>
                    <TouchableOpacity
                        style={styles.actionBtnWrapper}
                        onPress={() => navigation.navigate('Recommendations', {
                            scanId,
                            questionnaireId,
                            clinicalProfile,
                            analysis,
                        })}
                    >
                        <LinearGradient
                            colors={COLORS.accentGradient}
                            style={styles.actionBtn}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Text style={styles.actionBtnIcon}>💡</Text>
                            <Text style={styles.actionBtnText}>View Action Plan</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
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
    backButton: { padding: 8 },
    backButtonText: { color: COLORS.textPrimary, fontSize: 24 },
    headerTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: 'bold' },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    imageCard: {
        width: '100%',
        height: 300,
        backgroundColor: COLORS.surface,
        borderRadius: SIZES.radiusLg,
        overflow: 'hidden',
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
        position: 'relative',
    },
    resultImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    resultImagePlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    annotationOverlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
    },
    boundingRectangle: {
        width: 120,
        height: 80,
        borderWidth: 2,
        borderRadius: 8,
        borderStyle: 'dashed',
    },
    gradeCard: {
        backgroundColor: COLORS.surface,
        borderRadius: SIZES.radiusLg,
        padding: 24,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    cardTitle: {
        color: COLORS.textSecondary,
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 16,
    },
    sectionTitle: {
        color: COLORS.textSecondary,
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 12,
    },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: SIZES.radiusLg,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    gradeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    gradeCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        marginRight: 20,
    },
    gradeNumber: {
        fontSize: 32,
        fontWeight: 'bold',
    },
    gradeTextContainer: {
        flex: 1,
    },
    gradeLabel: {
        color: COLORS.textPrimary,
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    gradeSide: {
        color: COLORS.textSecondary,
        fontSize: 14,
        fontWeight: '500',
    },
    analysisDetails: {
        color: COLORS.textPrimary,
        fontSize: 15,
        lineHeight: 22,
    },
    actionContainer: {
        marginTop: 10,
    },
    actionBtnWrapper: {
        borderRadius: SIZES.radiusMd,
        elevation: 4,
    },
    actionBtn: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 18,
        borderRadius: SIZES.radiusMd,
    },
    actionBtnIcon: {
        fontSize: 20,
        marginRight: 10,
    },
    actionBtnText: {
        color: COLORS.textPrimary,
        fontSize: 16,
        fontWeight: 'bold',
    },
    medicationSection: {
        backgroundColor: COLORS.surface,
        borderRadius: SIZES.radiusLg,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    medicationCard: {
        backgroundColor: COLORS.background,
        borderRadius: SIZES.radiusMd,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
        elevation: 3,
    },
    medicationTitle: {
        color: COLORS.textPrimary,
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 10,
    },
    medicationLabel: {
        color: COLORS.textSecondary,
        fontSize: 13,
        fontWeight: '600',
        marginTop: 10,
    },
    medicationValue: {
        color: COLORS.textPrimary,
        fontSize: 15,
        marginTop: 4,
        lineHeight: 22,
    },
    emptyText: {
        color: COLORS.textSecondary,
        fontSize: 15,
        lineHeight: 22,
    },
});

export default ResultScreen;
