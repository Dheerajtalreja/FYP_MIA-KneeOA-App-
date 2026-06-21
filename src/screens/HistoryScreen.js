import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    ActivityIndicator,
    ScrollView,
    TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, SHADOWS } from '../config/theme';
import { fetchProfileHistory, fetchReports, fetchPatientHistory } from '../services/api';
import { getDatabase, getUser } from '../services/database';

const HistoryScreen = ({ navigation }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [currentUser, setCurrentUser] = useState(null);
    const [role, setRole] = useState('patient');
    const [patients, setPatients] = useState([]);
    const [selectedPatientKey, setSelectedPatientKey] = useState(null);
    const [questionnaires, setQuestionnaires] = useState([]);
    const [scans, setScans] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [cloudHistory, setCloudHistory] = useState([]);
    const [cloudReports, setCloudReports] = useState([]);
    const [searchText, setSearchText] = useState('');

    const loadHistory = useCallback(async () => {
        setLoading(true);
        setError('');

        try {
            const user = await getUser();
            if (!user) {
                throw new Error('No signed-in user found.');
            }

            setCurrentUser(user);
            setRole(user.role || 'patient');

            const database = await getDatabase();
            const cachedPatients = await database.getAllAsync(
                "SELECT id, server_id, email, full_name, role FROM users WHERE role = 'patient' ORDER BY updated_at DESC"
            );

            const normalizedPatients = cachedPatients.map((patient) => ({
                ...patient,
                key: String(patient.server_id || patient.email || patient.id),
            }));

            setPatients(normalizedPatients);

            const defaultPatientKey =
                user.role === 'gp'
                    ? normalizedPatients[0]?.key || String(user.server_id || user.email || user.id)
                    : String(user.server_id || user.email || user.id);

            const selectedKey = selectedPatientKey || defaultPatientKey;
            if (!selectedPatientKey) {
                setSelectedPatientKey(selectedKey);
            }

            const selectedRow =
                normalizedPatients.find((patient) => patient.key === selectedKey) ||
                normalizedPatients[0] ||
                { key: String(user.server_id || user.email || user.id), full_name: user.full_name, email: user.email, role: user.role };

            const userKey = selectedRow.key;

            const questionnaireRows = await database.getAllAsync(
                'SELECT * FROM questionnaire_responses WHERE user_id = ? ORDER BY completed_at DESC',
                [userKey]
            );
            const scanRows = await database.getAllAsync(
                'SELECT * FROM scan_history WHERE user_id = ? ORDER BY scanned_at DESC',
                [userKey]
            );
            const recommendationRows = await database.getAllAsync(
                'SELECT * FROM recommendations WHERE user_id = ? ORDER BY generated_at DESC',
                [userKey]
            );

            setQuestionnaires(questionnaireRows);
            setScans(scanRows);
            setRecommendations(recommendationRows);

            if (userKey === String(user.server_id || user.email || user.id)) {
                try {
                    const [profileHistoryResult, reportsResult] = await Promise.allSettled([fetchProfileHistory(), fetchReports()]);
                    
                    const profileHistory = profileHistoryResult.status === 'fulfilled' 
                        ? profileHistoryResult.value 
                        : null;
                    const reports = reportsResult.status === 'fulfilled' 
                        ? reportsResult.value 
                        : [];
                    
                    setCloudHistory(profileHistory?.history || []);
                    setCloudReports(Array.isArray(reports) ? reports : []);
                } catch (error) {
                    console.error('[HistoryScreen] Failed to fetch cloud data:', error);
                    setCloudHistory([]);
                    setCloudReports([]);
                }
            } else if (user.role === 'gp') {
                // GP viewing a patient: use clinician patient-history endpoint
                try {
                    const patientServerId = selectedRow.server_id || selectedRow.key;
                    const profileHistory = await fetchPatientHistory(patientServerId);
                    setCloudHistory(profileHistory?.history || []);
                    setCloudReports([]);
                } catch {
                    setCloudHistory([]);
                    setCloudReports([]);
                }
            } else {
                setCloudHistory([]);
                setCloudReports([]);
            }
        } catch (loadError) {
            setError(loadError.message || 'Unable to load history right now.');
        } finally {
            setLoading(false);
        }
    }, [selectedPatientKey]);

    useEffect(() => {
        loadHistory();
    }, []);

    const selectedPatient = useMemo(
        () =>
            patients.find((patient) => patient.key === selectedPatientKey) || {
                full_name: currentUser?.full_name || 'Current User',
                email: currentUser?.email || '',
            },
        [patients, selectedPatientKey, currentUser]
    );

    const filteredPatients = useMemo(() => {
        const query = searchText.trim().toLowerCase();
        if (!query) return patients;
        return patients.filter((patient) => {
            const fullName = String(patient.full_name || '').toLowerCase();
            const email = String(patient.email || '').toLowerCase();
            return fullName.includes(query) || email.includes(query);
        });
    }, [patients, searchText]);

    const formatDate = (value) => {
        if (!value) return 'Recently';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return String(value);
        return date.toLocaleString();
    };

    const renderCardList = (items, emptyText, renderItem) => {
        if (!items.length) {
            return <Text style={styles.emptyText}>{emptyText}</Text>;
        }

        return items.map(renderItem);
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={COLORS.gradientStart} />

            <LinearGradient colors={COLORS.headerGradient} style={styles.header} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={styles.decorCircleOne} />
                <View style={styles.decorCircleTwo} />
                <View style={styles.headerRow}>
                    <TouchableOpacity onPress={() => {
                        if (navigation.canGoBack()) {
                            navigation.goBack();
                        } else {
                            navigation.replace('Home');
                        }
                    }} style={styles.backButton}>
                        <Text style={styles.backButtonText}>←</Text>
                    </TouchableOpacity>
                    <View style={styles.headerTextBlock}>
                        <Text style={styles.title}>History</Text>
                        <Text style={styles.subtitle}>
                            {role === 'gp'
                                ? 'Review a synced patient record from the local cache.'
                                : 'Review your questionnaire, scan, and recommendation history.'}
                        </Text>
                    </View>
                    <TouchableOpacity onPress={loadHistory} style={styles.refreshButton}>
                        <Text style={styles.refreshButtonText}>↻</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {loading ? (
                <View style={styles.centerState}>
                    <ActivityIndicator color={COLORS.primary} size="large" />
                    <Text style={styles.centerStateText}>Loading history...</Text>
                </View>
            ) : error ? (
                <View style={styles.centerState}>
                    <Text style={styles.centerStateTitle}>Unable to load history</Text>
                    <Text style={styles.centerStateText}>{error}</Text>
                    <TouchableOpacity onPress={loadHistory} style={styles.retryButton}>
                        <Text style={styles.retryButtonText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                    <View style={styles.summaryCard}>
                        <Text style={styles.summaryLabel}>Viewing</Text>
                        <Text style={styles.summaryTitle}>{selectedPatient.full_name || 'Current User'}</Text>
                        <Text style={styles.summaryMeta}>{selectedPatient.email || 'No email available'}</Text>
                        <View style={styles.summaryCounts}>
                            <View style={styles.countPill}><Text style={styles.countText}>{questionnaires.length} questionnaires</Text></View>
                            <View style={styles.countPill}><Text style={styles.countText}>{scans.length} scans</Text></View>
                            <View style={styles.countPill}><Text style={styles.countText}>{recommendations.length} recommendations</Text></View>
                        </View>
                    </View>

                    {role === 'gp' && (
                        <View style={styles.sectionCard}>
                            <Text style={styles.sectionTitle}>Patient Cache</Text>
                            <Text style={styles.helperText}>
                                These patients come from local sync data. If a patient has not been synced yet, they will not appear here.
                            </Text>
                            <View style={styles.searchBox}>
                                <Text style={styles.searchIcon}>⌕</Text>
                                <TextInput
                                    value={searchText}
                                    onChangeText={setSearchText}
                                    placeholder="Search patient name or email"
                                    placeholderTextColor={COLORS.placeholder}
                                    style={styles.searchInput}
                                />
                            </View>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.patientRow}>
                                {filteredPatients.length ? filteredPatients.map((patient) => (
                                    <TouchableOpacity
                                        key={patient.key}
                                        onPress={() => setSelectedPatientKey(patient.key)}
                                        style={[
                                            styles.patientChip,
                                            selectedPatientKey === patient.key && styles.patientChipActive,
                                        ]}
                                    >
                                        <Text style={[styles.patientChipName, selectedPatientKey === patient.key && styles.patientChipNameActive]}>
                                            {patient.full_name || patient.email || 'Patient'}
                                        </Text>
                                        <Text style={[styles.patientChipMeta, selectedPatientKey === patient.key && styles.patientChipNameActive]}>
                                            {patient.email || 'No email'}
                                        </Text>
                                    </TouchableOpacity>
                                )) : <Text style={styles.emptyText}>No synced patients found.</Text>}
                            </ScrollView>
                        </View>
                    )}

                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Questionnaire History</Text>
                        {renderCardList(questionnaires, 'No questionnaire history available.', (item) => (
                            <View key={item.id} style={styles.timelineCard}>
                                <Text style={styles.timelineTitle}>Pain {item.pain_level ?? 0}/10 • Mobility {item.mobility_score ?? 0}/10</Text>
                                <Text style={styles.timelineMeta}>{formatDate(item.completed_at)}</Text>
                                <Text style={styles.timelineBody}>History: {item.previous_injuries || 'Not recorded'} • Medications: {item.medications || 'Not recorded'}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Scan History</Text>
                        {renderCardList(scans, 'No scan history available.', (item) => (
                            <View key={item.id} style={styles.timelineCard}>
                                <Text style={styles.timelineTitle}>{String(item.knee_side || 'knee').toUpperCase()} knee • KL {item.kl_grade ?? '-'}</Text>
                                <Text style={styles.timelineMeta}>{formatDate(item.scanned_at)}</Text>
                                <Text style={styles.timelineBody}>View: {item.view_type || 'PA'} • Confidence: {item.risk_score ?? 'n/a'}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Recommendation History</Text>
                        {renderCardList(recommendations, 'No recommendations available.', (item) => (
                            <View key={item.id} style={styles.timelineCard}>
                                <Text style={styles.timelineTitle}>Scan #{item.scan_id ?? 'n/a'}</Text>
                                <Text style={styles.timelineMeta}>{formatDate(item.generated_at)}</Text>
                                <Text style={styles.timelineBody}>{item.recommendation_text || 'Recommendation details stored locally.'}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Cloud Audit Trail</Text>
                        {selectedPatientKey === String(currentUser?.server_id || currentUser?.email || currentUser?.id) ? (
                            renderCardList(cloudHistory, 'No cloud history available yet.', (item, index) => (
                                <View key={item.log_id || index} style={styles.timelineCard}>
                                    <Text style={styles.timelineTitle}>{item.field_name || 'Profile field'}</Text>
                                    <Text style={styles.timelineMeta}>{formatDate(item.changed_at)}</Text>
                                    <Text style={styles.timelineBody}>{String(item.old_value ?? '—')} → {String(item.new_value ?? '—')}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.helperText}>
                                Cloud audit history is only available for the currently authenticated account. For GP patient records, use the local history sections above.
                            </Text>
                        )}
                    </View>

                    <View style={styles.sectionCard}>
                        <Text style={styles.sectionTitle}>Cloud Reports</Text>
                        {selectedPatientKey === String(currentUser?.server_id || currentUser?.email || currentUser?.id) ? (
                            renderCardList(cloudReports, 'No cloud reports available yet.', (item, index) => (
                                <View key={item.report_id || index} style={styles.timelineCard}>
                                    <Text style={styles.timelineTitle}>Report #{item.report_id || 'n/a'} • KL {item.kl_grade ?? '-'}</Text>
                                    <Text style={styles.timelineMeta}>{formatDate(item.created_at)}</Text>
                                    <Text style={styles.timelineBody}>{item.diagnosis_summary || item.recommendation || 'No summary available.'}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.helperText}>Cloud reports are only loaded for the current authenticated account.</Text>
                        )}
                    </View>
                </ScrollView>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
        paddingTop: 54,
        paddingHorizontal: 20,
        paddingBottom: 22,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        overflow: 'hidden',
    },
    decorCircleOne: {
        position: 'absolute', top: -24, right: -24, width: 120, height: 120, borderRadius: 60,
        backgroundColor: 'rgba(0, 210, 255, 0.07)',
    },
    decorCircleTwo: {
        position: 'absolute', bottom: -18, left: -20, width: 80, height: 80, borderRadius: 40,
        backgroundColor: 'rgba(108, 99, 255, 0.08)',
    },
    headerRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    backButton: {
        width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    backButtonText: { color: COLORS.textPrimary, fontSize: 22, fontWeight: '700' },
    headerTextBlock: { flex: 1 },
    title: { color: COLORS.textPrimary, fontSize: 26, fontWeight: '800' },
    subtitle: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 4 },
    refreshButton: {
        width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
        backgroundColor: 'rgba(255,255,255,0.08)',
    },
    refreshButtonText: { color: COLORS.textPrimary, fontSize: 18 },
    centerState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    centerStateTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 8 },
    centerStateText: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 10 },
    retryButton: {
        marginTop: 16, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 16,
        backgroundColor: COLORS.primary,
    },
    retryButtonText: { color: '#001018', fontWeight: '800' },
    content: { padding: 20, paddingBottom: 36 },
    summaryCard: {
        backgroundColor: COLORS.surface, borderRadius: 24, padding: 18, marginBottom: 16,
        borderWidth: 1, borderColor: COLORS.border, ...SHADOWS.medium,
    },
    summaryLabel: { color: COLORS.textLabel, textTransform: 'uppercase', fontSize: 11, fontWeight: '800' },
    summaryTitle: { color: COLORS.textPrimary, fontSize: 22, fontWeight: '800', marginTop: 6 },
    summaryMeta: { color: COLORS.textSecondary, marginTop: 4 },
    summaryCounts: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 14 },
    countPill: {
        backgroundColor: COLORS.surfaceLight, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 12,
        borderWidth: 1, borderColor: COLORS.border,
    },
    countText: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '700' },
    sectionCard: {
        backgroundColor: COLORS.surface, borderRadius: 24, padding: 18, marginBottom: 16,
        borderWidth: 1, borderColor: COLORS.border,
    },
    sectionTitle: { color: COLORS.textPrimary, fontSize: 18, fontWeight: '800', marginBottom: 10 },
    helperText: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 19, marginBottom: 12 },
    searchBox: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surfaceLight,
        borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, paddingHorizontal: 14, marginBottom: 14,
    },
    searchIcon: { color: COLORS.textSecondary, fontSize: 18, marginRight: 10 },
    searchInput: { flex: 1, color: COLORS.textPrimary, paddingVertical: 12 },
    patientRow: { gap: 10 },
    patientChip: {
        width: 180, backgroundColor: COLORS.surfaceLight, borderRadius: 18, padding: 12, borderWidth: 1, borderColor: COLORS.border,
    },
    patientChipActive: { borderColor: COLORS.borderFocused, backgroundColor: 'rgba(0, 210, 255, 0.12)' },
    patientChipName: { color: COLORS.textPrimary, fontWeight: '800' },
    patientChipNameActive: { color: COLORS.textPrimary },
    patientChipMeta: { color: COLORS.textSecondary, marginTop: 4, fontSize: 12 },
    timelineCard: {
        backgroundColor: COLORS.surfaceLight, borderRadius: 18, padding: 14, marginBottom: 10,
        borderWidth: 1, borderColor: COLORS.border,
    },
    timelineTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '800' },
    timelineMeta: { color: COLORS.textLabel, fontSize: 12, marginTop: 4 },
    timelineBody: { color: COLORS.textSecondary, fontSize: 13, lineHeight: 18, marginTop: 8 },
    emptyText: { color: COLORS.textMuted, fontSize: 13, fontStyle: 'italic' },
});

export default HistoryScreen;