// ─── Design System Tokens ──────────────────────────────────────
// Centralized theme for the KneeOA app. All new screens should
// import from here rather than hard-coding values.

export const COLORS = {
    // Primary palette
    primary: '#00D2FF',
    primaryDark: '#3A7BD5',
    accent: '#6C63FF',

    // Background gradients
    gradientStart: '#0F2027',
    gradientMid: '#203A43',
    gradientEnd: '#2C5364',

    // Surface colors
    background: '#0F1923',
    surface: '#1a2a3a',
    surfaceLight: '#1e3040',
    border: '#2a3a4a',
    borderFocused: '#00D2FF',

    // Text colors
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255,255,255,0.6)',
    textTertiary: 'rgba(255,255,255,0.4)',
    textMuted: '#5a6b7d',
    textLabel: '#8a9bb5',
    placeholder: '#8a9bb5',

    // Status colors
    success: '#00E676',
    warning: '#FFD600',
    error: '#FF5252',
    info: '#00D2FF',

    // KL Grade colors (0 = normal → 4 = severe)
    klGrade0: '#00E676',
    klGrade1: '#76FF03',
    klGrade2: '#FFD600',
    klGrade3: '#FF9100',
    klGrade4: '#FF5252',

    // Gradient arrays
    primaryGradient: ['#00D2FF', '#3A7BD5'],
    accentGradient: ['#6C63FF', '#3A7BD5'],
    headerGradient: ['#0F2027', '#203A43', '#2C5364'],
    dangerGradient: ['#f093fb', '#f5576c'],
    successGradient: ['#00E676', '#00B0FF'],
    fullPrimaryGradient: ['#00D2FF', '#3A7BD5', '#6C63FF'],

    // Disclaimer
    disclaimerBg: 'rgba(255, 82, 82, 0.08)',
    disclaimerBorder: 'rgba(255, 82, 82, 0.25)',
    disclaimerText: '#FF8A80',
};

export const FONTS = {
    regular: { fontWeight: '400' },
    medium: { fontWeight: '500' },
    semiBold: { fontWeight: '600' },
    bold: { fontWeight: '700' },
    extraBold: { fontWeight: '800' },
};

export const SIZES = {
    // Spacing
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,

    // Border radius
    radiusSm: 8,
    radiusMd: 14,
    radiusLg: 18,
    radiusXl: 24,
    radiusFull: 999,

    // Input / button heights
    inputHeight: 56,
    buttonHeight: 56,
};

export const SHADOWS = {
    small: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },
    medium: {
        shadowColor: '#00D2FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    glow: {
        shadowColor: '#00D2FF',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 4,
    },
};

// Helper to pick a KL grade color
export const getKLGradeColor = (grade) => {
    const map = {
        0: COLORS.klGrade0,
        1: COLORS.klGrade1,
        2: COLORS.klGrade2,
        3: COLORS.klGrade3,
        4: COLORS.klGrade4,
    };
    return map[grade] ?? COLORS.textMuted;
};

export const getKLGradeLabel = (grade) => {
    const map = {
        0: 'Normal',
        1: 'Doubtful',
        2: 'Mild',
        3: 'Moderate',
        4: 'Severe',
    };
    return map[grade] ?? 'Unknown';
};
