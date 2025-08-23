import { View, type ViewProps } from 'react-native';

import { useThemeColorOr } from './useThemeColor';

export type ThemedViewProps = ViewProps & {
  lightColor?: string;
  darkColor?: string;
};

export function ThemedView({ style, lightColor, darkColor, ...otherProps }: ThemedViewProps) {
  const backgroundColor = useThemeColorOr({ light: lightColor, dark: darkColor }, "background");

  return <View style={[{ backgroundColor }, style]} {...otherProps} />;
}
