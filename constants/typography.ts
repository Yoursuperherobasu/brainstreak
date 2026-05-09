import { TextStyle } from 'react-native';
import { Colors, FontSize } from './theme';

export const Typography: Record<string, TextStyle> = {
  hero: {
    fontFamily: 'Outfit_900Black',
    fontSize: FontSize.hero,
    color: Colors.textPrimary,
    letterSpacing: -1,
  },
  h1: {
    fontFamily: 'Outfit_700Bold',
    fontSize: FontSize.xxxl,
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  h2: {
    fontFamily: 'Outfit_700Bold',
    fontSize: FontSize.xxl,
    color: Colors.textPrimary,
  },
  h3: {
    fontFamily: 'Outfit_700Bold',
    fontSize: FontSize.xl,
    color: Colors.textPrimary,
  },
  body: {
    fontFamily: 'Inter_400Regular',
    fontSize: FontSize.md,
    color: Colors.textPrimary,
    lineHeight: 22,
  },
  bodyEmphasis: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  caption: {
    fontFamily: 'Inter_400Regular',
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
  },
  number: {
    fontFamily: 'Outfit_900Black',
    color: Colors.textPrimary,
  },
};
