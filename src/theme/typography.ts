import { TextStyle } from 'react-native';

export const typography = {
  h1: {
    fontSize: 26,
    fontWeight: '700',
    lineHeight: 32,
  } as TextStyle,
  h2: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  } as TextStyle,
  h3: {
    fontSize: 17,
    fontWeight: '600',
    lineHeight: 22,
  } as TextStyle,
  subtitle1: {
    fontSize: 15,
    fontWeight: '600',
    lineHeight: 20,
  } as TextStyle,
  subtitle2: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 18,
  } as TextStyle,
  body1: {
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 21,
  } as TextStyle,
  body2: {
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  } as TextStyle,
  caption: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
  } as TextStyle,
  overline: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  } as TextStyle,
  button: {
    fontSize: 15,
    fontWeight: '600',
  } as TextStyle,
} as const;
