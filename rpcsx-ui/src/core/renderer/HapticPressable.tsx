import { ComponentProps } from "react";
import { Pressable } from "react-native";
import * as Haptics from 'expo-haptics';

export function HapticPressable(props: ComponentProps<typeof Pressable>) {
    return (
        <Pressable
            {...props}
            onPressIn={(ev) => {
                if (process.env.EXPO_OS !== "web") {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }
                props.onPressIn?.(ev);
            }}
        />
    );
}
