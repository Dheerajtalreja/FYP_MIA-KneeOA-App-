import React, { useRef, useEffect } from 'react';
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
        subtitle: 'Deep learning powered OA grading',
        gradient: ['#6C63FF', '#3A7BD5'],
    },
    {
        id: '3',
        icon: '📊',
        title: 'View Reports',
        subtitle: 'Detailed analysis reports & history',
        gradient: ['#00B4DB', '#0083B0'],
    },
    {
        id: '4',
        icon: '📋',
        title: 'KL Grading',
        subtitle: 'Kellgren-Lawrence classification',
        gradient: ['#f093fb', '#f5576c'],
    },
];

const STATS = [
    { label: 'Scans Done', value: '24', icon: '🔬' },
    { label: 'Reports', value: '18', icon: '📑' },
    { label: 'Accuracy', value: '94%', icon: '🎯' },
];

const HomeScreen = ({ navigation }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const cardAnims = FEATURES.map(() => useRef(new Animated.Value(0)).current);

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
    }, []);

    const handleLogout = () => {
        navigation.replace('Login');
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
                            <Text style={styles.userName}>Dr. User</Text>
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
                        {STATS.map((stat, index) => (
                            <View key={index} style={styles.statCard}>
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

                <View style={styles.activityCard}>
                    <View style={styles.activityRow}>
                        <LinearGradient
                            colors={['#00D2FF', '#3A7BD5']}
                            style={styles.activityDot}
                        />
                        <View style={styles.activityInfo}>
                            <Text style={styles.activityTitle}>Left Knee X-Ray Analyzed</Text>
                            <Text style={styles.activityTime}>KL Grade 2 • 2 hours ago</Text>
                        </View>
                        <Text style={styles.activityArrow}>→</Text>
                    </View>
                </View>

                <View style={styles.activityCard}>
                    <View style={styles.activityRow}>
                        <LinearGradient
                            colors={['#6C63FF', '#3A7BD5']}
                            style={styles.activityDot}
                        />
                        <View style={styles.activityInfo}>
                            <Text style={styles.activityTitle}>Right Knee Scan Uploaded</Text>
                            <Text style={styles.activityTime}>KL Grade 1 • 5 hours ago</Text>
                        </View>
                        <Text style={styles.activityArrow}>→</Text>
                    </View>
                </View>

                <View style={styles.activityCard}>
                    <View style={styles.activityRow}>
                        <LinearGradient
                            colors={['#f093fb', '#f5576c']}
                            style={styles.activityDot}
                        />
                        <View style={styles.activityInfo}>
                            <Text style={styles.activityTitle}>Report Generated</Text>
                            <Text style={styles.activityTime}>Patient #1042 • Yesterday</Text>
                        </View>
                        <Text style={styles.activityArrow}>→</Text>
                    </View>
                </View>

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
                <TouchableOpacity style={styles.navItem}>
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
