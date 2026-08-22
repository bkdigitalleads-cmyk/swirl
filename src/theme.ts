import { useColorScheme } from 'react-native';

export interface Theme {
  bg: string;
  card: string;
  cardAlt: string;
  text: string;
  textSecondary: string;
  textFaint: string;
  accent: string;
  accentSoft: string;
  danger: string;
  border: string;
  success: string;
  isDark: boolean;
}

// Deep wine burgundy on warm cream: unmistakably about wine, and
// distinct from the blue/black tracker apps in the journal niche.
export const lightTheme: Theme = {
  bg: '#FAF6F3',
  card: '#FFFFFF',
  cardAlt: '#F4E9E7',
  text: '#2A1518',
  textSecondary: '#6E585B',
  textFaint: '#A8918F',
  accent: '#7B1E3B',
  accentSoft: '#F3DEE4',
  danger: '#C53030',
  border: '#ECDDD9',
  success: '#2F7D4F',
  isDark: false,
};

export const darkTheme: Theme = {
  bg: '#191113',
  card: '#241A1D',
  cardAlt: '#2F2327',
  text: '#F3EAEC',
  textSecondary: '#C3ABB0',
  textFaint: '#8B7479',
  accent: '#DE7A93',
  accentSoft: '#3A2229',
  danger: '#F56565',
  border: '#392A2E',
  success: '#68B587',
  isDark: true,
};

export function useTheme(): Theme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? darkTheme : lightTheme;
}

export const fonts = {
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
};
