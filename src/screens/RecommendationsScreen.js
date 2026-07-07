import React, { useEffect, useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Platform,
} from 'react-native';
import { Video } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES, SHADOWS } from '../config/theme';
import DisclaimerBanner from '../components/DisclaimerBanner';
import { fetchRecommendations, fetchVideoLibrary } from '../services/api';

const DEFAULT_VIDEOS = [
    { id: 1, title: 'Straight Leg Raises', time: '5 mins', difficulty: 'Easy', icon: '🦵' },
    { id: 2, title: 'Seated Knee Extension', time: '4 mins', difficulty: 'Easy', icon: '🪑' },
];

const RecommendationsScreen = ({ navigation, route }) => {
    const [recommendation, setRecommendation] = useState(null);
    const [videos, setVideos] = useState([]);
    const [selectedVideo, setSelectedVideo] = useState(null);
    const [loading, setLoading] = useState(true);
    const videoRef = useRef(null);

    const scanId = route.params?.scanId;
    const questionnaireId = route.params?.questionnaireId;
    const clinicalProfile = route.params?.clinicalProfile;
    const analysis = route.params?.analysis;
    const grade = route.params?.grade ?? analysis?.klGrade ?? analysis?.kl_grade ?? 0;

    const extractVideoUrl = (item) => {
        if (!item) return null;
        if (typeof item === 'string') return item;

        if (Array.isArray(item.exercise_video_urls) && item.exercise_video_urls.length) {
            return item.exercise_video_urls[0];
        }
        if (Array.isArray(item.exerciseVideoUrls) && item.exerciseVideoUrls.length) {
            return item.exerciseVideoUrls[0];
        }
        if (Array.isArray(item.video_urls) && item.video_urls.length) {
            return item.video_urls[0];
        }

        return (
            item.video_url ||
            item.videoUrl ||
            item.url ||
            item.s3_url ||
            item.s3Url ||
            item.presigned_url ||
            item.signed_url ||
            item.media_url ||
            (item.source && (typeof item.source === 'string' ? item.source : item.source.uri)) ||
            item.exercise_video_url ||
            item.exerciseVideoUrl ||
            null
        );
    };

    const buildVideoObject = (item, index) => {
        if (!item) return null;
        if (typeof item === 'string') {
            return {
                id: `backend-video-${index}`,
                title: `Exercise Video ${index + 1}`,
                url: item,
                time: 'Video',
                difficulty: 'Personalized',
                icon: '▶',
            };
        }

        const url = extractVideoUrl(item);
        return {
            id: item.video_id || item.id || item.title ? item.title : `video-${index}`,
            title: item.title || item.name || item.label || `Exercise Video ${index + 1}`,
            url,
            time: item.duration_seconds ? `${Math.round(item.duration_seconds / 60)} mins` : item.duration || item.time || '5 mins',
            difficulty: item.difficulty || item.level || 'Easy',
            icon: item.icon || '▶',
        };
    };

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

                const analysisVideoUrls = Array.isArray(analysis?.exerciseVideoUrls)
                    ? analysis.exerciseVideoUrls
                    : Array.isArray(analysis?.exercise_video_urls)
                    ? analysis.exercise_video_urls
                    : [];

                const parsedAnalysisVideos = analysisVideoUrls
                    .map(buildVideoObject)
                    .filter((video) => video && video.url);

                if (parsedAnalysisVideos.length > 0) {
                    setVideos(parsedAnalysisVideos);
                    setSelectedVideo(parsedAnalysisVideos[0]);
                } else if (videosResult.status === 'fulfilled') {
                    const library = videosResult.value;
                    const normalizedVideos = Array.isArray(library) ? library : library?.items || library?.videos || [];

                    const mappedVideos = normalizedVideos
                        .map(buildVideoObject)
                        .filter((video) => video && video.url);

                    if (mappedVideos.length > 0) {
                        setVideos(mappedVideos);
                        setSelectedVideo(mappedVideos[0]);
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
                <TouchableOpacity style={styles.backButton} onPress={() => {
                    if (navigation.canGoBack()) {
                        navigation.goBack();
                    } else {
                        navigation.replace('Home');
                    }
                }}>
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
                    
                    {selectedVideo && (
                    <View style={styles.playerSection}>
                        <Text style={styles.sectionTitle}>Now Playing</Text>
                        {selectedVideo?.url ? (
                            <Video
                                ref={videoRef}
                                style={styles.videoPlayer}
                                source={{ uri: selectedVideo.url }}
                                useNativeControls
                                resizeMode="contain"
                                shouldPlay
                                onError={({ nativeEvent }) => {
                                    console.error('[RecommendationsScreen] Video playback error', nativeEvent);
                                }}
                            />
                        ) : (
                            <View style={styles.videoUnavailable}>
                                <Text style={styles.listText}>Video URL unavailable. Tap another exercise or refresh the library.</Text>
                            </View>
                        )}
                    </View>
                )}

                {videos.map(v => (
                        <TouchableOpacity key={v.id} style={styles.videoCard} onPress={() => setSelectedVideo(v)}>
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
                                {v.url ? (
                                    <Text style={styles.urlHint}>Tap to play video</Text>
                                ) : (
                                    <Text style={styles.urlHint}>No playback URL available</Text>
                                )}
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
        ...SHADOWS.small,
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
    urlHint: {
        marginTop: 8,
        color: COLORS.textSecondary,
        fontSize: 12,
    },
    playerSection: {
        marginBottom: 20,
    },
    videoPlayer: {
        width: '100%',
        height: 220,
        borderRadius: SIZES.radiusMd,
        backgroundColor: '#000',
    },
    videoUnavailable: {
        padding: 16,
        borderRadius: SIZES.radiusMd,
        backgroundColor: COLORS.surfaceLight,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
});

export default RecommendationsScreen;
