import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  View,
  Text,
} from 'react-native';
import Animated, {
  FadeOut,
  SlideInRight,
} from 'react-native-reanimated';
import * as explorer from '$explorer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as self from '$';
import { useWindowDimensions } from 'react-native';
import { ThemedText } from '$core/ThemedText';
import { ThemedView } from '$core/ThemedView';
import { LanguageItem } from '$core/LanguageItem';
import { FocusableText } from '$core/FocusableText';
import { useThemeColor, withAlpha } from '$core/useThemeColor'
import { RPCSXBackground } from '$core/RPCSXBackground';
import * as RNLocalize from 'react-native-localize';

export function InitialSetup() {
  const { width } = useWindowDimensions();
  const scrollRef = useRef<ScrollView>(null);
  const [step, setStep] = useState(0);
  const insets = useSafeAreaInsets();
  const primaryColor = useThemeColor("primary");
  const secondaryColor = useThemeColor("secondary");

  const LANGUAGES = [
    { id: 'en', label: 'English' },
    { id: 'ja', label: '日本語' },
    { id: 'fr', label: 'Français' },
    { id: 'de', label: 'Deutsch' },
    { id: 'es', label: 'Español' },
    { id: 'it', label: 'Italiano' },
  ];

  const [language, setLanguage] = useState<string | null>(null);

  const handleSelect = useCallback((id: string) => {
    setLanguage(id);
  }, []);

  useEffect(() => {
    if (language !== null) return;

    const availableIds = LANGUAGES.map(l => l.id);

    const locales = RNLocalize.getLocales();

    if (!locales.length) {
      setLanguage('en');
      return;
    }

    const deviceLang = locales[0].languageCode.toLowerCase();

    const matched = availableIds.includes(deviceLang)
      ? deviceLang
      : 'en';

    setLanguage(matched);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      x: step * width,
      animated: false,
    });
  }, [width]);

  const steps = [
    {
      title: 'Welcome to RPCSX',
      subtitle: "Let's get things set up",
      content: 'RPCSX will help you configure everything.',
      confirmText: 'Start (X)',
    },
    {
      title: 'Choose Language',
      subtitle: 'Select your preferred language',
      content: 'You can change this later in settings.',
      confirmText: 'Select (X)',
    },
    {
      title: 'Scan Games',
      subtitle: 'Find your games',
      content: 'We will scan your folders for supported games.',
      confirmText: 'Scan (X)',
    },
    {
      title: 'Ready to Go',
      subtitle: 'Setup complete',
      content: 'You\'re all set. Enjoy playing!',
      confirmText: 'Finish (X)',
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
      self.setupSetShowInitialSetupScreen({ value: false });
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
    <View
      style={{
        flex: 1,
      }}
    >
      <RPCSXBackground />

      {/* Pager */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
      >
        {steps.map((s, index) =>
          index === 1 ? (
            <ThemedView
              style={{
                width,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'transparent',
                padding: 24,
              }}
            >
            <ThemedText
              style={{
                color: '#fff',
                fontSize: 36,
                fontWeight: '500',
                letterSpacing: 0.4,
                marginBottom: 8,
              }}
            >
              {s.title}
            </ThemedText>

            <ThemedText
              style={{
                fontSize: 14,
                marginBottom: 32,
                color: withAlpha(secondaryColor, 0.75),
              }}
            >
              {s.content}
            </ThemedText>

            {/* Language Grid */}
            <ThemedView
              style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              justifyContent: 'center',
              maxWidth: 520,
              backgroundColor: 'transparent',
            }}
            >
              {LANGUAGES.map(lang => (
                <LanguageItem
                  key={lang.id}
                  lang={lang}
                  selected={language === lang.id}
                  primaryColor={primaryColor}
                  onPress={() => handleSelect(lang.id)}
                />
              ))}
            </ThemedView>
            </ThemedView>
        ) : (
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
                color: '#fff',
                fontSize: 34,
                fontWeight: '500',
                textAlign: 'center',
                letterSpacing: 0.4,
                textShadowColor: 'rgba(120,180,255,0.45)',
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 10,
              }}
            >
              {s.title}
            </Text>

            <ThemedText
              style={{
                marginTop: 0,
                fontSize: 14,
                color: secondaryColor,
                textAlign: 'center',
                textShadowColor: 'rgba(23, 25, 27, 0.27)',
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: 10,
              }}
            >
              {s.subtitle}
            </ThemedText>
          </Animated.View>
        ))}
      </ScrollView>

      <ThemedView
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          padding: 16,
          paddingBottom: insets.bottom + 16,
          gap: 12,
          backgroundColor: 'transparent',
        }}
      >
        <ThemedText
          style={{
            marginTop: 0,
            fontSize: 16,
            textAlign: 'center',
            maxWidth: 420,
            color: withAlpha(secondaryColor, 0.95),
            lineHeight: 22,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
          }}
        >
          {steps[step].content}
        </ThemedText>
      </ThemedView>

      {/* Step indicators */}
      <ThemedView
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          marginBottom: 16,
          backgroundColor: 'transparent',
        }}
      >
        {steps.map((_, i) => (
          <ThemedView
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
      </ThemedView>

      {/* Bottom buttons */}
      <ThemedView
        style={{
          flexDirection: 'row',
          padding: 16,
          paddingBottom: insets.bottom + 16,
          gap: 12,
          backgroundColor: 'transparent',
        }}
      >
        {step > 0 && (
          <ThemedView style={{ flex: 1, backgroundColor: 'transparent', alignItems: 'center' }}>
            <FocusableText onPress={back}>
              Back (O)
            </FocusableText>
          </ThemedView>
        )}

        <ThemedView style={{ flex: 1, backgroundColor: 'transparent', alignItems: 'center' }}>
          <FocusableText
            onPress={next}
          >
            {steps[step].confirmText}
          </FocusableText>
        </ThemedView>
      </ThemedView>
    </View>
  );
}

