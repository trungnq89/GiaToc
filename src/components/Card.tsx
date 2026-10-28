import React, { PropsWithChildren } from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { colors, radius, spacing } from '../theme';

export interface CardProps extends PropsWithChildren {
  style?: ViewStyle;
  onPress?: () => void;
  bordered?: boolean;
}

export function Card({ children, style, onPress, bordered = true }: CardProps) {
  const content = (
    <View
      style={[
        styles.card,
        bordered && styles.border,
        style,
      ]}>
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.7} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  border: {
    borderWidth: 1,
    borderColor: colors.border,
  },
});
