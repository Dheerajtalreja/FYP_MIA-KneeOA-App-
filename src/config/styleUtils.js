import { SHADOWS, COLORS, SIZES } from './theme';

export const cardStyle = {
    backgroundColor: COLORS.surface,
    borderRadius: SIZES.radiusLg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
};

export const sectionTitleStyle = {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: SIZES.sm,
};

export const subtleTextStyle = {
    color: COLORS.textSecondary,
    fontSize: 13,
    lineHeight: 20,
};
