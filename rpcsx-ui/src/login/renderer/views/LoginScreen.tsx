import React, { useMemo, useRef } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  useWindowDimensions,
  TextInput,
} from 'react-native';

import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

import { Svg, Path } from 'react-native-svg';
import { useThemeColor } from '$core/useThemeColor';
import { Styles } from '$core/Styles';

const XLogo = ({ size = 48 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24">
    <Path
      d="M18.9 2H21L14.6 9.4L22 22H16.2L11.6 15.1L5.6 22H3.5L10.3 14L3.2 2H9.2L13.3 8.1L18.9 2Z"
      fill="#ffffff"
    />
  </Svg>
);

export function LoginScreen() {
  const pagerRef = useRef<ScrollView>(null);
  const { width, height } = useWindowDimensions();

  const onSurface = useThemeColor('onSurface');
  const outline = useThemeColor('outline');
  const primary = useThemeColor('primary');
  const onPrimary = useThemeColor('onPrimary');

  const isCompact = height < 700 || width < 500;
  const qrSize = Math.min(width * 0.5, isCompact ? 160 : 220);

  const btnScale = useSharedValue(1);
  const btnX = useSharedValue(0);
  const btnOpacity = useSharedValue(1);

  const spring = {
    damping: 18,
    stiffness: 180,
    mass: 0.8,
  };

  const manualBtnStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: btnScale.value },
      { translateX: btnX.value },
    ],
    opacity: btnOpacity.value,
  }));

  const onManualPress = () => {
    btnScale.value = withSpring(0.94, spring);
    btnX.value = withSpring(-width * 0.4, spring);
    btnOpacity.value = withSpring(
      0,
      { damping: 20, stiffness: 120 },
      (finished) => {
        if (finished) {
          runOnJS(goToManual)();
        }
      }
    );
  };

  const goToManual = () => {
    pagerRef.current?.scrollTo({ x: width, animated: true });
  };

  const goToQR = () => {
    pagerRef.current?.scrollTo({ x: 0, animated: true });
     btnScale.value = 1;
     btnX.value = 0;
     btnOpacity.value = 1;
  };

  const styles = useMemo(
    () =>
      Styles({
        width,
        onSurface,
        outline,
        primary,
        onPrimary,
      }),
    [width, onSurface, outline, primary, onPrimary]
  );

  return (
    <ScrollView
      ref={pagerRef}
      horizontal
      pagingEnabled
      scrollEnabled={false}
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.page}>
        <View style={styles.card}>
          <View style={styles.header}>
            <XLogo size={isCompact ? 36 : 48} />
            <Text style={styles.brand}>RPCSX</Text>
          </View>

          <Text style={[styles.title, styles.mb4]}>Sign in with QR Code</Text>
          <Text style={styles.description}>
            Scan the QR code using the RPCSX mobile app.
          </Text>

          <View style={[styles.qrBox, { width: qrSize, height: qrSize }]}>
            <Text style={styles.qrText}>QR</Text>
          </View>

          <View style={styles.actions}>
            <Animated.View style={manualBtnStyle}>
              <Pressable style={[styles.primaryButton, styles.mb12]} onPress={onManualPress}>
                <Text style={styles.primaryText}>Sign In Manually</Text>
              </Pressable>
            </Animated.View>

            <Pressable style={styles.secondaryButton}>
              <Text style={styles.secondaryText}>Create an Account</Text>
            </Pressable>
          </View>
        </View>
      </View>

      <View style={styles.page}>
        <View style={styles.card}>
          <Text style={[styles.title, styles.mb12]}>Sign In</Text>
          <Text style={[styles.description, styles.mb12]}>
            Enter your email and password
          </Text>

          <TextInput
            placeholder="Email"
            placeholderTextColor="#888"
            style={[styles.input, styles.mb12]}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextInput
            placeholder="Password"
            placeholderTextColor="#888"
            style={[styles.input]}
            secureTextEntry
          />

          <View style={styles.actions}>
            <Pressable style={[styles.primaryButton, styles.mb12]}>
              <Text style={styles.primaryText}>Sign In</Text>
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={goToQR}>
              <Text style={styles.secondaryText}>Back to QR Login</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </ScrollView>
  );
}
