import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, radius, spacing, typography } from '../theme';
import { Icon } from './Icon';

export interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: string;
  activeColor?: string;
  style?: ViewStyle;
}

export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  activeColor = colors.primary,
  style,
}: ChipProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.chip,
        selected && { backgroundColor: activeColor, borderColor: activeColor },
        style,
      ]}>
      {icon && (
        <Icon
          name={icon}
          size={16}
          color={selected ? colors.textInverse : colors.textSecondary}
        />
      )}
      <Text
        style={[
          typography.subtitle2,
          styles.text,
          selected ? { color: colors.textInverse, fontWeight: '600' } : { color: colors.textSecondary },
        ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
  },
  text: {
    fontSize: 13,
  },
});
