import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Platform,
    Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES } from '../config/theme';
import { analyzeUploadedXray, uploadXrayImage } from '../services/api';
import { getUser, saveScanResult } from '../services/database';

const ImageCaptureScreen = ({ navigation, route }) => {
    const [imageUri, setImageUri] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [kneeSide, setKneeSide] = useState('left');
    const questionnaireId = route.params?.questionnaireId;
    const clinicalProfile = route.params?.clinicalProfile;

    const pickImage = async (source) => {
        try {
            const permission =
                source === 'camera'
                    ? await ImagePicker.requestCameraPermissionsAsync()
                    : await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (permission.status !== 'granted') {
                Alert.alert(
                    'Permission required',
                    source === 'camera'
                        ? 'Camera access is required to capture an X-ray image.'
                        : 'Photo library access is required to choose an X-ray image.'
                );
                return;
            }

            const result =
                source === 'camera'
                    ? await ImagePicker.launchCameraAsync({
                          mediaTypes: ImagePicker.MediaTypeOptions.Images,
                          quality: 0.9,
                          allowsEditing: false,
                      })
                    : await ImagePicker.launchImageLibraryAsync({
                          mediaTypes: ImagePicker.MediaTypeOptions.Images,
                          quality: 0.9,
                          allowsEditing: false,
                      });

            if (!result.canceled && result.assets?.[0]?.uri) {
                setImageUri(result.assets[0].uri);
            }
        } catch (error) {
            Alert.alert('Unable to open picker', error.message || 'Please try again.');
        }
    };

    const handleSelectImage = () => {
        Alert.alert(
            'Select X-Ray',
            'Choose an image source',
            [
                { text: 'Camera', onPress: () => pickImage('camera') },
                { text: 'Gallery', onPress: () => pickImage('library') },
                { text: 'Cancel', style: 'cancel' }
            ]
        );
    };

    const handleAnalyze = async () => {
        if (!imageUri) return;
        setAnalyzing(true);

        try {
            const currentUser = await getUser();
            const userId = currentUser?.server_id || currentUser?.email || currentUser?.id || 'current_user';
            const uploadResult = await uploadXrayImage(imageUri);
            const imageId = uploadResult?.image_id ?? uploadResult?.imageId ?? uploadResult?.id;

            const analysis = await analyzeUploadedXray(
                imageId,
                clinicalProfile?.painLevel ?? null,
                clinicalProfile?.mobilityLevel ?? null
            );
            const normalizedResult = {
                reportId: analysis?.report_id || analysis?.reportId || null,
                imageId: analysis?.image_id || analysis?.imageId || imageId || null,
                klGrade: analysis?.kl_grade ?? analysis?.klGrade ?? 0,
                confidence: analysis?.confidence ?? analysis?.risk_score ?? analysis?.riskScore ?? 0,
                diagnosisSummary:
                    analysis?.diagnosis_summary ||
                    analysis?.details ||
                    'Analysis completed successfully.',
                recommendation: analysis?.recommendation || null,
                lifestylePlan: analysis?.lifestyle_plan || [],
                warnings: analysis?.warnings || [],
                exerciseVideoUrls: analysis?.exercise_video_urls || [],
            };

            const scanId = await saveScanResult({
                userId,
                imageUri,
                imageType: 'xray',
                viewType: 'PA',
                kneeSide,
                klGrade: normalizedResult.klGrade,
                riskScore: normalizedResult.confidence,
                analysisResult: analysis,
                annotations: analysis?.warnings || {},
            });

            navigation.navigate('Result', {
                imageUri,
                kneeSide,
                scanId,
                questionnaireId,
                clinicalProfile,
                analysis: normalizedResult,
            });
        } catch (error) {
            const fallbackResult = {
                klGrade: null,
                riskScore: 0,
                diagnosisSummary:
                    error?.message ||
                    'Unable to analyze this image. Please upload a clearer X-ray and try again.',
                details:
                    error?.message ||
                    'Unable to analyze this image. Please upload a clearer X-ray and try again.',
                recommendation: null,
                warnings: [],
                isInvalid: true,
            };

            const currentUser = await getUser();
            const userId = currentUser?.server_id || currentUser?.email || currentUser?.id || 'current_user';

            const scanId = await saveScanResult({
                userId,
                imageUri,
                imageType: 'xray',
                viewType: 'PA',
                kneeSide,
                klGrade: null,
                riskScore: 0,
                analysisResult: fallbackResult,
                annotations: {
                    error: error?.message || 'Image analysis failed',
                },
            });

            navigation.navigate('Result', {
                imageUri,
                kneeSide,
                scanId,
                questionnaireId,
                clinicalProfile,
                analysis: fallbackResult,
            });
        } finally {
            setAnalyzing(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <Text style={styles.backButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Scan X-Ray</Text>
                <View style={{ width: 40 }} />
            </View>

            <View style={styles.content}>
                <Text style={styles.instruction}>
                    Upload a Posterior-Anterior (PA) view X-ray of the knee for AI analysis.
                </Text>

                <View style={styles.sideSelector}>
                    <TouchableOpacity
                        style={[styles.sideBtn, kneeSide === 'left' && styles.sideBtnActive]}
                        onPress={() => setKneeSide('left')}
                    >
                        <Text style={[styles.sideBtnText, kneeSide === 'left' && styles.sideBtnTextActive]}>Left Knee</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.sideBtn, kneeSide === 'right' && styles.sideBtnActive]}
                        onPress={() => setKneeSide('right')}
                    >
                        <Text style={[styles.sideBtnText, kneeSide === 'right' && styles.sideBtnTextActive]}>Right Knee</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={styles.imageContainer}
                    onPress={handleSelectImage}
                    disabled={analyzing}
                >
                    {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.previewImage} />
                    ) : (
                        <View style={styles.placeholderContainer}>
                            <LinearGradient
                                colors={COLORS.primaryGradient}
                                style={styles.iconCircle}
                            >
                                <Text style={styles.cameraIcon}>📷</Text>
                            </LinearGradient>
                            <Text style={styles.placeholderText}>Tap to capture or upload X-Ray</Text>
                        </View>
                    )}
                </TouchableOpacity>

                {imageUri && (
                    <TouchableOpacity style={styles.retakeBtn} onPress={handleSelectImage}>
                        <Text style={styles.retakeBtnText}>Retake Image</Text>
                    </TouchableOpacity>
                )}
            </View>

            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.analyzeBtnWrapper, !imageUri && { opacity: 0.5 }]}
                    onPress={handleAnalyze}
                    disabled={!imageUri || analyzing}
                >
                    <LinearGradient
                        colors={COLORS.primaryGradient}
                        style={styles.analyzeBtn}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Text style={styles.analyzeBtnText}>
                            {analyzing ? 'Analyzing X-Ray...' : 'Start AI Analysis'}
                        </Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
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
    content: {
        flex: 1,
        padding: 24,
    },
    instruction: {
        color: COLORS.textSecondary,
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 24,
    },
    sideSelector: {
        flexDirection: 'row',
        backgroundColor: COLORS.surfaceLight,
        borderRadius: SIZES.radiusMd,
        padding: 4,
        marginBottom: 30,
    },
    sideBtn: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: SIZES.radiusSm,
    },
    sideBtnActive: {
        backgroundColor: COLORS.surface,
        elevation: 2,
    },
    sideBtnText: {
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    sideBtnTextActive: {
        color: COLORS.primary,
    },
    imageContainer: {
        flex: 1,
        backgroundColor: COLORS.surface,
        borderRadius: SIZES.radiusLg,
        borderWidth: 2,
        borderColor: COLORS.border,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    previewImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'contain',
    },
    placeholderContainer: {
        alignItems: 'center',
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    cameraIcon: {
        fontSize: 32,
    },
    placeholderText: {
        color: COLORS.textSecondary,
        fontSize: 16,
    },
    retakeBtn: {
        alignSelf: 'center',
        marginTop: 20,
        paddingVertical: 10,
        paddingHorizontal: 20,
    },
    retakeBtnText: {
        color: COLORS.accent,
        fontWeight: '600',
        fontSize: 16,
    },
    footer: {
        padding: 24,
        paddingBottom: Platform.OS === 'ios' ? 40 : 24,
        backgroundColor: COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: COLORS.border,
    },
    analyzeBtnWrapper: {
        borderRadius: SIZES.radiusMd,
    },
    analyzeBtn: {
        height: SIZES.buttonHeight,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: SIZES.radiusMd,
    },
    analyzeBtnText: {
        color: COLORS.textPrimary,
        fontSize: 18,
        fontWeight: 'bold',
    },
});

export default ImageCaptureScreen;
