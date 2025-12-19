import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Button,
  ScrollView,
} from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInRight,
} from 'react-native-reanimated';
import * as explorer from '$explorer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as self from '$';
import { useWindowDimensions } from 'react-native';
import { json } from 'stream/consumers';

export function InitialSetup() {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [step, setStep] = useState(0);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    scrollRef.current?.scrollTo({
      x: step * width,
      animated: false,
    });
  }, [width]);

  const steps = [
    {
      title: 'Welcome to RPCSX',
      subtitle: 'Let’s get things set up',
      content: 'RPCSX will help you configure everything.',
    },
    {
      title: 'Scan Games',
      subtitle: 'Find your games',
      content: 'We will scan your folders for supported games.',
    },
    {
      title: 'Ready to Go',
      subtitle: 'Setup complete',
      content: 'You’re all set. Enjoy playing!',
    },
  ];

  const goToStep = (index: number) => {
    scrollRef.current?.scrollTo({
      x: index * width,
      animated: true,
    });
    setStep(index);
  };

  const next = () => {
    if (step < steps.length - 1) {
      goToStep(step + 1);
    } else {
      self.setupSetShowInitialSetupScreen(false);
      explorer.setExplorerView({
        filter: { type: 'game' },
      });
    }
  };

  const back = () => {
    if (step > 0) {
      goToStep(step - 1);
    }
  };

  return (
    <View style={{ flex: 1 }}>
      {/* Pager */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
      >
        {steps.map((s, index) => (
          <Animated.View
            key={index}
            entering={SlideInRight.duration(500)}
            exiting={FadeOut.duration(200)}
            style={{
              width,
              padding: 24,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text
              style={{
                fontSize: 34,
                fontWeight: '500',
                textAlign: 'center',
                letterSpacing: 0.3,
              }}
            >
              {s.title}
            </Text>

            <Text
              style={{
                marginTop: 8,
                fontSize: 14,
                color: 'rgba(255,255,255,0.65)',
                textAlign: 'center',
              }}
            >
              {s.subtitle}
            </Text>

            <Text
              style={{
                marginTop: 24,
                fontSize: 16,
                textAlign: 'center',
                maxWidth: 420,
                color: 'rgba(255,255,255,0.65)',
                lineHeight: 22,
              }}
            >
              {s.content}
            </Text>
          </Animated.View>
        ))}
      </ScrollView>

      {/* Step indicators */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          marginBottom: 16,
        }}
      >
        {steps.map((_, i) => (
          <View
            key={i}
            style={{
              width: 26,
              height: 2,
              marginHorizontal: 4,
              backgroundColor:
              i === step ? '#4da3ff' : 'rgba(255,255,255,0.25)',
            }}
          />
        ))}
      </View>

      {/* Bottom buttons */}
      <View
        style={{
          flexDirection: 'row',
          padding: 16,
          paddingBottom: insets.bottom + 16,
          gap: 12,
          backgroundColor: 'rgba(0,0,0,0.25)',
        }}
      >
        {step > 0 && (
          <View style={{ flex: 1 }}>
            <Button title="Back" onPress={back} />
          </View>
        )}

        <View style={{ flex: 1 }}>
          <Button
            title={step === steps.length - 1 ? 'Finish' : 'Continue'}
            onPress={next}
          />
        </View>
      </View>
    </View>
  );
}

