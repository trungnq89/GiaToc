import React from 'react';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { colors } from '../theme';

export interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

export function Icon({ name, size = 24, color = colors.text, style }: IconProps) {
  return <MaterialCommunityIcons name={name} size={size} color={color} style={style} />;
}
