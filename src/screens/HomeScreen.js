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

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        const loadInitialData = async () => {
            try {
                setLoading(true);
                const [user, dashboardData] = await Promise.all([
                    getUser(),
                    getDashboardData() // Your new API call
                ]);
                
                setCurrentUser(user);
                setStats(dashboardData.stats); // Expected: [{label, value, icon}, ...]
                setFeatures(dashboardData.features); // Expected: [{id, type, title, subtitle}, ...]
            } catch (error) {
                console.error("Error loading dashboard:", error);
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
            {/* ... Keep your existing header logic, replacing hardcoded STATS with stats variable ... */}
            
            {/* Example of mapping the dynamic stats */}
            <View style={styles.statsRow}>
                {stats.map((stat, index) => (
                    <View key={index} style={styles.statCard}>
                        <Text style={styles.statIcon}>{stat.icon}</Text>
                        <Text style={styles.statValue}>{stat.value}</Text>
                        <Text style={styles.statLabel}>{stat.label}</Text>
                    </View>
                ))}
            </View>

            {/* ... Features mapping ... */}
            <View style={styles.cardsGrid}>
                {features.map((item) => {
                    const config = FEATURE_UI_CONFIG[item.type] || FEATURE_UI_CONFIG['analysis'];
                    return (
                        <TouchableOpacity 
                            key={item.id} 
                            style={styles.card}
                            onPress={() => config.route && navigation.navigate(config.route, { questionnaireId, clinicalProfile })}
                        >
                             <LinearGradient colors={config.gradient} style={styles.cardIconContainer}>
                                <Text style={styles.cardIcon}>{config.icon}</Text>
                            </LinearGradient>
                            <Text style={styles.cardTitle}>{item.title}</Text>
                            <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
            
            {/* ... Rest of your component ... */}
        </View>
    );
};
export default HomeScreen;