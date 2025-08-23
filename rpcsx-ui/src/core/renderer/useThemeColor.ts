import { useColorScheme } from './useColorScheme';
import { Colors } from './Colors';

export function useThemeColor(
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  return Colors[useColorScheme()][colorName];
}

export function useThemeColorOr(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const theme = useColorScheme();
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}
