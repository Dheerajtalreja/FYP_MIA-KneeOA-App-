import React from 'react';
import { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES } from '../config/theme';
import DisclaimerBanner from '../components/DisclaimerBanner';
import { fetchRecommendations, fetchVideoLibrary } from '../services/api';

const DEFAULT_VIDEOS = [
    { id: 1, title: 'Straight Leg Raises', time: '5 mins', difficulty: 'Easy', icon: '🦵' },
    { id: 2, title: 'Seated Knee Extension', time: '4 mins', difficulty: 'Easy', icon: '🪑' },
];

const RecommendationsScreen = ({ navigation, route }) => {
    const [recommendation, setRecommendation] = useState(null);
    const [videos, setVideos] = useState(DEFAULT_VIDEOS);
    const [loading, setLoading] = useState(true);

    const scanId = route.params?.scanId;
    const questionnaireId = route.params?.questionnaireId;
    const clinicalProfile = route.params?.clinicalProfile;
    const analysis = route.params?.analysis;
    const grade = route.params?.grade ?? 0;

    useEffect(() => {
        let active = true;

        const loadData = async () => {
            setLoading(true);

            try {
                const [recommendationsResult, videosResult] = await Promise.allSettled([
                    fetchRecommendations(
                        grade,
                        clinicalProfile?.painLevel ?? null,
                        clinicalProfile?.mobilityLevel ?? null
                    ),
                    fetchVideoLibrary(grade),
                ]);

                if (!active) return;

                if (recommendationsResult.status === 'fulfilled' && recommendationsResult.value) {
                    setRecommendation(recommendationsResult.value);
                }

                if ((!recommendationsResult.value || !recommendationsResult.value.recommendation) && analysis?.recommendation) {
                    setRecommendation({ recommendation: analysis.recommendation, lifestyle_plan: analysis.lifestylePlan || [] });
                }

                if (videosResult.status === 'fulfilled') {
                    const library = videosResult.value;
                    const normalizedVideos = Array.isArray(library) ? library : library?.items || library?.videos || [];

                    if (normalizedVideos.length > 0) {
                        setVideos(
                            normalizedVideos.map((item, index) => ({
                                id: item.video_id || item.id || index + 1,
                                title: item.title || 'Exercise',
                                time: item.duration_seconds ? `${Math.round(item.duration_seconds / 60)} mins` : '5 mins',
                                difficulty: item.difficulty || 'Easy',
                                icon: item.icon || '▶',
                            }))
                        );
                    }
                }
            } catch (error) {
                console.warn('Failed to load recommendations:', error.message);
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        loadData();

        return () => {
            active = false;
        };
    }, [grade, scanId, questionnaireId]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Action Plan</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <DisclaimerBanner compact />

                {recommendation && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Personalized Summary</Text>
                        <View style={styles.card}>
                            <Text style={styles.listText}>
                                {recommendation.recommendation || recommendation.diagnosis_summary || 'Your personalized plan is ready.'}
                            </Text>
                            {Array.isArray(recommendation.lifestyle_plan) && recommendation.lifestyle_plan.length > 0 ? (
                                <Text style={[styles.listText, { marginTop: 12 }]}>Structured lifestyle plan available from the backend.</Text>
                            ) : null}
                        </View>
                    </View>
                )}

                {loading && (
                    <View style={styles.section}>
                        <View style={styles.card}>
                            <Text style={styles.listText}>Loading recommendations from the backend...</Text>
                        </View>
                    </View>
                )}

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Lifestyle Recommendations</Text>
                    <View style={styles.card}>
                        <View style={styles.listItem}>
                            <Text style={styles.bullet}>•</Text>
                            <Text style={styles.listText}>Maintain a healthy weight to reduce stress on your knees.</Text>
                        </View>
                        <View style={styles.listItem}>
                            <Text style={styles.bullet}>•</Text>
                            <Text style={styles.listText}>Use supportive footwear with good cushioning.</Text>
                        </View>
                        <View style={styles.listItem}>
                            <Text style={styles.bullet}>•</Text>
                            <Text style={styles.listText}>Apply cold packs for 15 minutes after activities if swelling occurs.</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Rehabilitation Exercises</Text>
                    <Text style={styles.subSubtitle}>Tailored for your recent scan analysis</Text>
                    
                    {videos.map(v => (
                        <TouchableOpacity key={v.id} style={styles.videoCard}>
                            <View style={styles.videoThumbnail}>
                                <Text style={styles.videoIcon}>{v.icon}</Text>
                                <View style={styles.playOverlay}>
                                    <Text style={styles.playIcon}>▶</Text>
                                </View>
                            </View>
                            <View style={styles.videoInfo}>
                                <Text style={styles.videoTitle}>{v.title}</Text>
                                <View style={styles.videoMeta}>
                                    <Text style={styles.metaText}>⏱ {v.time}</Text>
                                    <Text style={styles.metaText}>•</Text>
                                    <Text style={styles.metaText}>💪 {v.difficulty}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
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
        paddingBottom: 60,
    },
    section: {
        marginTop: 24,
    },
    sectionTitle: {
        color: COLORS.textPrimary,
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    subSubtitle: {
        color: COLORS.textSecondary,
        fontSize: 14,
        marginBottom: 16,
        marginTop: -10,
    },
    card: {
        backgroundColor: COLORS.surface,
        borderRadius: SIZES.radiusLg,
        padding: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    listItem: {
        flexDirection: 'row',
        marginBottom: 12,
        alignItems: 'flex-start',
    },
    bullet: {
        color: COLORS.primary,
        fontSize: 18,
        marginRight: 10,
        marginTop: -2,
    },
    listText: {
        color: COLORS.textPrimary,
        fontSize: 15,
        lineHeight: 22,
        flex: 1,
    },
    videoCard: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        borderRadius: SIZES.radiusMd,
        overflow: 'hidden',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    videoThumbnail: {
        width: 100,
        height: 80,
        backgroundColor: COLORS.surfaceLight,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    videoIcon: {
        fontSize: 40,
        opacity: 0.5,
    },
    playOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    playIcon: {
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
    },
    videoInfo: {
        flex: 1,
        padding: 12,
        justifyContent: 'center',
    },
    videoTitle: {
        color: COLORS.textPrimary,
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 6,
    },
    videoMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    metaText: {
        color: COLORS.textSecondary,
        fontSize: 12,
    },
});

export default RecommendationsScreen;
