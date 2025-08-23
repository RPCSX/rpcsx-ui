import { StyleSheet, Text, TextProps } from 'react-native';
import { useThemeColorOr } from './useThemeColor';

export type ThemedTextProps = TextProps & {
  color?: ThemedColor;
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({
  style,
  color,
  type = 'default',
  ...rest
}: ThemedTextProps) {
  const resultColor = useThemeColorOr(color ?? {}, "text");

  return (
    <Text
      style={[
        { color: resultColor },
        type === 'default' ? styles.default : undefined,
        type === 'title' ? styles.title : undefined,
        type === 'defaultSemiBold' ? styles.defaultSemiBold : undefined,
        type === 'subtitle' ? styles.subtitle : undefined,
        type === 'link' ? styles.link : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 32,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 32,
    fontWeight: '600',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    lineHeight: 32,
  },
  subtitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
    color: '#0a7ea4',
  },
});
