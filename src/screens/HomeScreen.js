import React, { useRef, useEffect, useState } from 'react';
import {
    View, Text, TouchableOpacity, StyleSheet, StatusBar, Animated,
    Dimensions, ScrollView, ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
// Import your service function here
import { getDashboardData } from '../services/api';
import { getUser } from '../services/database';

const { width } = Dimensions.get('window');

// Keep UI styles/config local for design consistency
const FEATURE_UI_CONFIG = {
    'upload': { icon: '📷', gradient: ['#00D2FF', '#3A7BD5'], route: 'ImageCapture' },
    'analysis': { icon: '🤖', gradient: ['#6C63FF', '#3A7BD5'] },
    'reports': { icon: '📊', gradient: ['#00B4DB', '#0083B0'], route: 'History' },
    'grading': { icon: '📋', gradient: ['#f093fb', '#f5576c'] },
};

const HomeScreen = ({ navigation, route }) => {
    const questionnaireId = route.params?.questionnaireId;
    const clinicalProfile = route.params?.clinicalProfile;

    // State for dynamic data
    const [currentUser, setCurrentUser] = useState(null);
    const [stats, setStats] = useState([]);
    const [features, setFeatures] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                setLoading(true);
                setError(null);
                const [user, dashboardData] = await Promise.all([
                    getUser(),
                    getDashboardData() // Your new API call
                ]);

                setCurrentUser(user);
                setStats(dashboardData?.stats ?? []); // Expected: [{label, value, icon}, ...]
                setFeatures(dashboardData?.features ?? []); // Expected: [{id, type, title, subtitle}, ...]
            } catch (err) {
                console.error("Error loading dashboard:", err);
                setError('Could not load your dashboard. Pull down to retry.');
            } finally {
                setLoading(false);
            }
        };

        loadInitialData();

        // Animations
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]).start();
    }, []);

    if (loading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F1923' }}>
                <ActivityIndicator size="large" color="#00D2FF" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <LinearGradient
                colors={['#152232', '#0F1923']}
                style={styles.header}
            >
                <View style={styles.decorCircle1} />
                <View style={styles.decorCircle2} />

                <View style={styles.headerContent}>
                    <View style={styles.headerTop}>
                        <View>
                            <Text style={styles.greeting}>Welcome back</Text>
                            <Text style={styles.userName}>
                                {currentUser?.name || currentUser?.fullName || 'there'}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.profileButton}
                            onPress={() => navigation.navigate('Profile')}
                        >
                            <LinearGradient
                                colors={['#00D2FF', '#3A7BD5']}
                                style={styles.profileGradient}
                            >
                                <Text style={styles.profileIcon}>👤</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>

                    {/* Stats */}
                    <View style={styles.statsRow}>
                        {stats.map((stat, index) => (
                            <View key={index} style={styles.statCard}>
                                <Text style={styles.statIcon}>{stat.icon}</Text>
                                <Text style={styles.statValue}>{stat.value}</Text>
                                <Text style={styles.statLabel}>{stat.label}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            </LinearGradient>

            {/* Scrollable body */}
            <ScrollView
                style={styles.scrollContent}
                contentContainerStyle={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

                    {error && (
                        <Text style={{ color: '#f5576c', marginBottom: 16 }}>{error}</Text>
                    )}

                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Quick Actions</Text>
                    </View>

                    {/* Feature cards */}
                    <View style={styles.cardsGrid}>
                        {features.map((item) => {
                            const config = FEATURE_UI_CONFIG[item.type] || FEATURE_UI_CONFIG['analysis'];
                            return (
                                <View key={item.id} style={styles.cardWrapper}>
                                    <TouchableOpacity
                                        style={styles.card}
                                        onPress={() => config.route && navigation.navigate(config.route, { questionnaireId, clinicalProfile })}
                                    >
                                        <LinearGradient colors={config.gradient} style={styles.cardIconContainer}>
                                            <Text style={styles.cardIcon}>{config.icon}</Text>
                                        </LinearGradient>
                                        <Text style={styles.cardTitle}>{item.title}</Text>
                                        <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
                    </View>

                </Animated.View>
            </ScrollView>

            {/* Bottom navigation */}
            <View style={styles.bottomNav}>
                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Home')}>
                    <Text style={styles.navIconActive}>🏠</Text>
                    <Text style={styles.navLabelActive}>Home</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('History')}>
                    <Text style={styles.navIcon}>📊</Text>
                    <Text style={styles.navLabel}>Reports</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.scanButton}
                    onPress={() => navigation.navigate('ImageCapture', { questionnaireId, clinicalProfile })}
                >
                    <LinearGradient colors={['#00D2FF', '#3A7BD5']} style={styles.scanButtonGradient}>
                        <Text style={styles.scanButtonIcon}>+</Text>
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Settings')}>
                    <Text style={styles.navIcon}>⚙️</Text>
                    <Text style={styles.navLabel}>Settings</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Profile')}>
                    <Text style={styles.navIcon}>👤</Text>
                    <Text style={styles.navLabel}>Profile</Text>
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
        paddingBottom: 20,
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