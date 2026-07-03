import React, { useRef, useEffect, useCallback, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Animated,
    Dimensions,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../contexts/AuthContext';
import { fetchProfile, fetchReports } from '../services/api';
import { getDatabase, getUser } from '../services/database';

const { width } = Dimensions.get('window');

const FEATURES = [
    {
        id: '1',
        icon: '📷',
        title: 'Upload X-Ray',
        subtitle: 'Capture or import knee X-ray images',
        gradient: ['#00D2FF', '#3A7BD5'],
        route: 'ImageCapture',
    },
    {
        id: '2',
        icon: '🤖',
        title: 'AI Analysis',
        subtitle: 'Complete your profile for AI insights',
        gradient: ['#6C63FF', '#3A7BD5'],
        route: 'Questionnaire',
    },
    {
        id: '3',
        icon: '📊',
        title: 'View Reports',
        subtitle: 'Detailed analysis reports & history',
        gradient: ['#00B4DB', '#0083B0'],
        route: 'History',
    },
    {
        id: '4',
        icon: '📋',
        title: 'KL Grading',
        subtitle: 'Review knee grade history and findings',
        gradient: ['#f093fb', '#f5576c'],
        route: 'History',
    },
];

const DEFAULT_STATS = [
    { label: 'Scans Done', value: '0', icon: '🔬' },
    { label: 'Reports', value: '0', icon: '📑' },
    { label: 'Accuracy', value: '--', icon: '🎯' },
];

const formatTimeAgo = (value) => {
    if (!value) return 'Just now';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Recently';

    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMinutes < 1) return 'Just now';
    if (diffMinutes < 60) return `${diffMinutes} min ago`;
    if (diffHours < 24) return `${diffHours} hr ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    return date.toLocaleDateString();
};

const safeParseJson = (value) => {
    if (!value) return {};
    if (typeof value === 'object') return value;

    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
};

const HomeScreen = ({ navigation }) => {
    const { logout } = useAuth();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    // FIX: Keep animation values inside one stable ref so hook count never depends on FEATURES length.
    const cardAnims = useRef(FEATURES.map(() => new Animated.Value(0))).current;
    const [stats, setStats] = useState(DEFAULT_STATS);
    const [activities, setActivities] = useState([]);
    const [userName, setUserName] = useState('Dr. User');

    const loadDashboardData = useCallback(async () => {
        try {
            let user = await getUser();
            if (!user?.full_name && !user?.fullName && !user?.name && !user?.profile?.full_name && !user?.profile?.fullName) {
                try {
                    const profile = await fetchProfile();
                    user = { ...user, ...profile, profile: profile || user?.profile || {} };
                } catch (profileError) {
                    console.warn('[HomeScreen] Failed to fetch profile for display:', profileError);
                }
            }

            const userKey = user?.server_id || user?.email || user?.id || 'current_user';
            const resolvedUserName =
                user?.full_name ||
                user?.fullName ||
                user?.profile?.full_name ||
                user?.profile?.fullName ||
                user?.name ||
                user?.email ||
                'Dr. User';
            setUserName(resolvedUserName);

            const database = await getDatabase();
            const [scanRows, reports] = await Promise.all([
                database.getAllAsync(
                    'SELECT * FROM scan_history WHERE user_id = ? ORDER BY scanned_at DESC',
                    [userKey]
                ),
                fetchReports().catch(() => []),
            ]);

            const scanCount = Array.isArray(scanRows) ? scanRows.length : 0;
            const reportCount = Array.isArray(reports) ? reports.length : 0;
            const normalizedScanRows = Array.isArray(scanRows) ? scanRows : [];

            const confidenceValues = normalizedScanRows
                .map((scan) => {
                    const parsedAnalysis = safeParseJson(scan.analysis_result);
                    const rawConfidence = Number(
                        scan.risk_score ??
                        scan.confidence ??
                        parsedAnalysis.confidence ??
                        parsedAnalysis.risk_score ??
                        0
                    );
                    if (!Number.isFinite(rawConfidence) || rawConfidence < 0) return null;
                    return rawConfidence > 1 ? rawConfidence : rawConfidence * 100;
                })
                .filter((value) => value !== null);

            const avgConfidence = confidenceValues.length
                ? confidenceValues.reduce((sum, value) => sum + value, 0) / confidenceValues.length
                : 0;
            const accuracyValue = scanCount
                ? `${Math.round(Math.min(100, Math.max(0, avgConfidence)))}%`
                : '--';

            setStats([
                { label: 'Scans Done', value: String(scanCount), icon: '🔬' },
                { label: 'Reports', value: String(reportCount), icon: '📑' },
                { label: 'Accuracy', value: accuracyValue, icon: '🎯' },
            ]);

            const recentActivities = normalizedScanRows.slice(0, 3).map((scan) => {
                const side = scan.knee_side ? `${scan.knee_side} knee` : 'Knee';
                const isAnalyzed = scan.kl_grade != null || scan.analysis_result;
                const gradeText = scan.kl_grade != null ? `KL Grade ${scan.kl_grade}` : 'Scan uploaded';
                return {
                    title: `${side.charAt(0).toUpperCase()}${side.slice(1)} ${isAnalyzed ? 'Analyzed' : 'Uploaded'}`,
                    timeLabel: `${gradeText} • ${formatTimeAgo(scan.scanned_at)}`,
                };
            });

            setActivities(
                recentActivities.length
                    ? recentActivities
                    : [
                          {
                              title: 'No scans yet',
                              timeLabel: 'Upload your first X-ray to see activity here',
                          },
                      ]
            );
        } catch (error) {
            setStats(DEFAULT_STATS);
            setActivities([
                {
                    title: 'Unable to load activity',
                    timeLabel: 'Please try again in a moment',
                },
            ]);
        }
    }, []);

    useEffect(() => {
        // Header animation
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 500,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 500,
                useNativeDriver: true,
            }),
        ]).start();

        // Staggered card animations
        Animated.stagger(
            120,
            cardAnims.map((anim) =>
                Animated.spring(anim, {
                    toValue: 1,
                    friction: 6,
                    tension: 40,
                    useNativeDriver: true,
                })
            )
        ).start();

        loadDashboardData();
        const unsubscribe = navigation.addListener('focus', loadDashboardData);
        return unsubscribe;
    }, [cardAnims, fadeAnim, loadDashboardData, navigation, slideAnim]);

    const handleLogout = async () => {
        // FIX: Clear the real auth session before routing so the app cannot restore a stale login state.
        await logout?.();
        navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
        });
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#0F2027" />

            {/* Header */}
            <LinearGradient
                colors={['#0F2027', '#203A43', '#2C5364']}
                style={styles.header}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.decorCircle1} />
                <View style={styles.decorCircle2} />

                <Animated.View
                    style={[
                        styles.headerContent,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }],
                        },
                    ]}
                >
                    <View style={styles.headerTop}>
                        <View>
                            <Text style={styles.greeting}>Good Evening 👋</Text>
                            <Text style={styles.userName}>{userName}</Text>
                        </View>
                        <TouchableOpacity style={styles.profileButton} onPress={handleLogout}>
                            <LinearGradient
                                colors={['#00D2FF', '#6C63FF']}
                                style={styles.profileGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <Text style={styles.profileIcon}>👤</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    {/* Stats Row */}
                    <View style={styles.statsRow}>
                        {stats.map((stat, index) => (
                            <View key={`${stat.label}-${index}`} style={styles.statCard}>
                                <Text style={styles.statIcon}>{stat.icon}</Text>
                                <Text style={styles.statValue}>{stat.value}</Text>
                                <Text style={styles.statLabel}>{stat.label}</Text>
                            </View>
                        ))}
                    </View>
                </Animated.View>
            </LinearGradient>

            {/* Main Content */}
            <ScrollView
                style={styles.scrollContent}
                contentContainerStyle={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* Quick Actions Title */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <TouchableOpacity>
                        <Text style={styles.seeAllText}>See All</Text>
                    </TouchableOpacity>
                </View>

                {/* Feature Cards */}
                <View style={styles.cardsGrid}>
                    {FEATURES.map((feature, index) => (
                        <Animated.View
                            key={feature.id}
                            style={[
                                styles.cardWrapper,
                                {
                                    opacity: cardAnims[index],
                                    transform: [
                                        {
                                            translateY: cardAnims[index].interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [30, 0],
                                            }),
                                        },
                                        {
                                            scale: cardAnims[index].interpolate({
                                                inputRange: [0, 1],
                                                outputRange: [0.9, 1],
                                            }),
                                        },
                                    ],
                                },
                            ]}
                        >
                            <TouchableOpacity
                                style={styles.card}
                                activeOpacity={0.7}
                                onPress={() => feature.route ? navigation.navigate(feature.route) : null}
                            >
                                <LinearGradient
                                    colors={feature.gradient}
                                    style={styles.cardIconContainer}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <Text style={styles.cardIcon}>{feature.icon}</Text>
                                </LinearGradient>
                                <Text style={styles.cardTitle}>{feature.title}</Text>
                                <Text style={styles.cardSubtitle}>{feature.subtitle}</Text>
                            </TouchableOpacity>
                        </Animated.View>
                    ))}
                </View>

                {/* Recent Activity */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Recent Activity</Text>
                </View>

                {activities.map((activity, index) => (
                    <View key={`${activity.title}-${index}`} style={styles.activityCard}>
                        <View style={styles.activityRow}>
                            <LinearGradient
                                colors={[
                                    index % 3 === 0 ? '#00D2FF' : index % 3 === 1 ? '#6C63FF' : '#f093fb',
                                    index % 3 === 0 ? '#3A7BD5' : '#3A7BD5',
                                ]}
                                style={styles.activityDot}
                            />
                            <View style={styles.activityInfo}>
                                <Text style={styles.activityTitle}>{activity.title}</Text>
                                <Text style={styles.activityTime}>{activity.timeLabel}</Text>
                            </View>
                            <Text style={styles.activityArrow}>→</Text>
                        </View>
                    </View>
                ))}

                {/* Bottom Spacer */}
                <View style={{ height: 30 }} />
            </ScrollView>

            {/* Bottom Navigation */}
            <View style={styles.bottomNav}>
                <TouchableOpacity style={styles.navItem}>
                    <Text style={styles.navIconActive}>🏠</Text>
                    <Text style={styles.navLabelActive}>Home</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem}>
                    <Text style={styles.navIcon}>📷</Text>
                    <Text style={styles.navLabel}>Scan</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.scanButton} onPress={() => navigation.navigate('ImageCapture')}>
                    <LinearGradient
                        colors={['#00D2FF', '#6C63FF']}
                        style={styles.scanButtonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Text style={styles.scanButtonIcon}>+</Text>
                    </LinearGradient>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('History')}>
                    <Text style={styles.navIcon}>📊</Text>
                    <Text style={styles.navLabel}>Reports</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.navItem} onPress={handleLogout}>
                    <Text style={styles.navIcon}>⚙️</Text>
                    <Text style={styles.navLabel}>Settings</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0F1923',
    },
    header: {
        paddingTop: 50,
        paddingBottom: 24,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        overflow: 'hidden',
    },
    decorCircle1: {
        position: 'absolute',
        top: -20,
        right: -20,
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: 'rgba(0, 210, 255, 0.06)',
    },
    decorCircle2: {
        position: 'absolute',
        bottom: -10,
        left: -20,
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(108, 99, 255, 0.06)',
    },
    headerContent: {},
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    greeting: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
    },
    userName: {
        fontSize: 24,
        fontWeight: '800',
        color: '#FFFFFF',
        marginTop: 4,
    },
    profileButton: {
        width: 46,
        height: 46,
        borderRadius: 23,
    },
    profileGradient: {
        width: 46,
        height: 46,
        borderRadius: 23,
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileIcon: {
        fontSize: 22,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 10,
    },
    statCard: {
        flex: 1,
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 14,
        paddingVertical: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.06)',
    },
    statIcon: {
        fontSize: 20,
        marginBottom: 6,
    },
    statValue: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FFFFFF',
    },
    statLabel: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.5)',
        marginTop: 2,
        fontWeight: '500',
    },
    scrollContent: {
        flex: 1,
    },
    scrollContainer: {
        paddingHorizontal: 20,
        paddingTop: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    seeAllText: {
        fontSize: 13,
        color: '#00D2FF',
        fontWeight: '600',
    },
    cardsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    cardWrapper: {
        width: (width - 52) / 2,
        marginBottom: 12,
    },
    card: {
        backgroundColor: '#1a2a3a',
        borderRadius: 18,
        padding: 18,
        borderWidth: 1,
        borderColor: '#2a3a4a',
    },
    cardIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 14,
    },
    cardIcon: {
        fontSize: 24,
    },
    cardTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
        marginBottom: 4,
    },
    cardSubtitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
        lineHeight: 16,
    },
    activityCard: {
        backgroundColor: '#1a2a3a',
        borderRadius: 14,
        padding: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#2a3a4a',
    },
    activityRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    activityDot: {
        width: 10,
        height: 10,
        borderRadius: 5,
        marginRight: 14,
    },
    activityInfo: {
        flex: 1,
    },
    activityTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    activityTime: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.4)',
        marginTop: 2,
    },
    activityArrow: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.3)',
    },
    bottomNav: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 10,
        paddingBottom: 20,
        backgroundColor: '#152232',
        borderTopWidth: 1,
        borderTopColor: '#2a3a4a',
    },
    navItem: {
        alignItems: 'center',
        paddingVertical: 4,
    },
    navIcon: {
        fontSize: 22,
        opacity: 0.5,
    },
    navIconActive: {
        fontSize: 22,
    },
    navLabel: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.4)',
        marginTop: 4,
        fontWeight: '500',
    },
    navLabelActive: {
        fontSize: 10,
        color: '#00D2FF',
        marginTop: 4,
        fontWeight: '700',
    },
    scanButton: {
        marginTop: -30,
    },
    scanButtonGradient: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#00D2FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 8,
    },
    scanButtonIcon: {
        fontSize: 28,
        color: '#FFFFFF',
        fontWeight: '300',
        marginTop: -2,
    },
});

export default HomeScreen;
