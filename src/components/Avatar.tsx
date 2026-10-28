import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, radius, typography } from '../theme';
import { Gender, FamilyBranch } from '../types';

export interface AvatarProps {
  uri?: string;
  name: string;
  gender?: Gender;
  branch?: FamilyBranch;
  size?: 'sm' | 'md' | 'lg' | 'xl' | number;
  isDeceased?: boolean;
}

const SIZES = {
  sm: 36,
  md: 48,
  lg: 64,
  xl: 96,
};

export function Avatar({
  uri,
  name,
  gender = 'male',
  branch = 'noi',
  size = 'md',
  isDeceased = false,
}: AvatarProps) {
  const pixelSize = typeof size === 'number' ? size : SIZES[size];
  const initial = (name.trim().split(' ').pop() || name || '?')[0].toUpperCase();

  const getBgColor = () => {
    if (isDeceased) return colors.deceased;
    if (branch === 'noi') return colors.branchNoi;
    if (branch === 'ngoai') return colors.branchNgoai;
    if (branch === 'vo_chong') return colors.branchVoChong;
    return gender === 'female' ? colors.female : colors.male;
  };

  const fontSize = pixelSize * 0.42;

  return (
    <View
      style={[
        styles.container,
        {
          width: pixelSize,
          height: pixelSize,
          borderRadius: pixelSize / 2,
          backgroundColor: getBgColor(),
        },
      ]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[
            styles.image,
            {
              width: pixelSize,
              height: pixelSize,
              borderRadius: pixelSize / 2,
            },
          ]}
        />
      ) : (
        <Text style={[typography.subtitle1, { fontSize, color: colors.textInverse, fontWeight: '700' }]}>
          {initial}
        </Text>
      )}

      {isDeceased && (
        <View style={styles.deceasedBadge}>
          <Text style={styles.deceasedText}>✝</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    resizeMode: 'cover',
  },
  deceasedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#334155',
    borderRadius: radius.full,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },
  deceasedText: {
    color: '#F8FAFC',
    fontSize: 9,
    fontWeight: '700',
  },
});
