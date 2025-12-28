import React, { memo, useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolateColor,
} from 'react-native-reanimated';
import { ThemedText } from './ThemedText';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const ITEM_WIDTH = 220;
const ITEM_HEIGHT = 56;
const BORDER_SIZE = 2;

type Props = {
  lang: { id: string; label: string };
  selected: boolean;
  onPress: () => void;
  primaryColor: string;
};

export const LanguageItem = memo(function LanguageItem({
  lang,
  selected,
  onPress,
  primaryColor,
}: Props) {
  const [focused, setFocused] = useState(false);
  const [hovered, setHovered] = useState(false);

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value =
      focused || hovered || selected
        ? withSpring(1, { damping: 16, stiffness: 200 })
        : withTiming(0, { duration: 160 });
  }, [focused, hovered, selected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + progress.value * 0.06 }],
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      ['rgba(0,0,0,0.25)', 'rgba(77,163,255,0.16)'],
    ),
  }));

  const borderStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    borderColor: primaryColor,
  }));

  return (
    <AnimatedPressable
      focusable
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      onPress={onPress}
      style={{
        width: ITEM_WIDTH,
        height: ITEM_HEIGHT,
        margin: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Animated.View
        style={[
          {
            width: ITEM_WIDTH,
            height: ITEM_HEIGHT,
            borderRadius: 10,
            alignItems: 'center',
            justifyContent: 'center',
          },
          animatedStyle,
        ]}
      >
        {/* Border overlay */}
        <Animated.View
          pointerEvents="none"
          style={[
            {
              position: 'absolute',
              inset: 0,
              borderRadius: 10,
              borderWidth: BORDER_SIZE,
            },
            borderStyle,
          ]}
        />

        <ThemedText
          style={{
            fontSize: 18,
            letterSpacing: 0.3,
            color:
              selected || focused || hovered
                ? primaryColor
                : '#fff',
          }}
        >
          {lang.label}
        </ThemedText>
      </Animated.View>
    </AnimatedPressable>
  );
});

