import React, { useRef } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  cancelAnimation,
} from 'react-native-reanimated';
import { ThemedText } from './ThemedText';

const AnimatedText = Animated.createAnimatedComponent(ThemedText);

export function FocusableText({
  children,
  onPress,
}: {
  children: React.ReactNode;
  onPress?: () => void;
}) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(0.85);

  const isFocused = useRef(false);
  const isHovered = useRef(false);
  const isActive = useRef(false);
  const suppressHover = useRef(false);

  const updateState = () => {
    const nextActive =
      isFocused.current ||
      (isHovered.current && !suppressHover.current);

    if (isActive.current === nextActive) return;
    isActive.current = nextActive;

    cancelAnimation(scale);
    cancelAnimation(opacity);

    if (nextActive) {
      scale.value = withSpring(1.25, {
        damping: 16,
        stiffness: 180,
      });
      opacity.value = withTiming(1, { duration: 120 });
    } else {
      scale.value = withTiming(1, { duration: 180 });
      opacity.value = withTiming(0.85, { duration: 200 });
    }
  };

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Pressable
      focusable
      onPress={() => {
        suppressHover.current = true;
        isFocused.current = false;
        isHovered.current = false;
        updateState();
        onPress?.();
        setTimeout(() => {
          suppressHover.current = false;
        }, 120);
      }}
      onFocus={() => {
        isFocused.current = true;
        updateState();
      }}
      onBlur={() => {
        isFocused.current = false;
        updateState();
      }}
      onHoverIn={() => {
        if (suppressHover.current) return;
        isHovered.current = true;
        updateState();
      }}
      onHoverOut={() => {
        isHovered.current = false;
        updateState();
      }}
    >
      <AnimatedText
        style={[
          {
            fontSize: 16,
            fontWeight: '500',
            color: '#fff',
          },
          animatedStyle,
        ]}
      >
        {children}
      </AnimatedText>
    </Pressable>
  );
}
