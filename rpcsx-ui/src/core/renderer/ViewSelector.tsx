import { scheduleOnMainThread } from './scheduleOnMainThread';
import { useEffect, useState } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    interpolate,
    withTiming,
    cancelAnimation,
    withSequence
} from 'react-native-reanimated';
import { useThemeColor } from './useThemeColor';

export function LeftRightViewSelector<T extends any>(props: { selectedItem: number, list: T[], renderItem: (item: T) => React.JSX.Element, style?: StyleProp<ViewStyle> }) {
    const [selectedItem, setSelectedItem] = useState(props.selectedItem);
    const [prevSelectedItem, setPrevSelectedItem] = useState(-1);
    const animation = useSharedValue(100);
    const layout = useWindowDimensions();

    const directionRight = selectedItem > prevSelectedItem;
    const hideStyle = useAnimatedStyle(() => ({
        flexWrap: 'nowrap',
        transform: [{
            translateX: directionRight ? interpolate(animation.value, [0, 100], [0, -layout.width]) : interpolate(animation.value, [0, 100], [0, layout.width])
        }],
        opacity: interpolate(animation.value, [0, 100], [1, 0])
    }));

    const showStyle = useAnimatedStyle(() => ({
        flexWrap: 'nowrap',
        transform: [{
            translateX: directionRight ? interpolate(animation.value, [0, 100], [layout.width, 0]) : interpolate(animation.value, [0, 100], [-layout.width, 0])
        }],
        opacity: interpolate(animation.value, [0, 100], [0, 1])
    }));

    useEffect(() => {
        if (selectedItem != props.selectedItem) {
            setPrevSelectedItem(selectedItem);
            setSelectedItem(props.selectedItem);
            animation.value = 0;
        }

        if (prevSelectedItem != -1) {
            animation.value = withTiming(100, {
                duration: 400,
                easing: Easing.inOut(Easing.ease)
            }, (finished) => {
                if (finished) {
                    scheduleOnMainThread(setPrevSelectedItem, -1);
                }
            });
        }
    });

    const item = props.renderItem(props.list[selectedItem]);

    if (prevSelectedItem == -1) {
        return (<View style={props.style}>{item}</View>)
    }

    return (
        <View style={props.style}>
            {prevSelectedItem != -1 && <Animated.View style={[props.style, hideStyle, { position: 'absolute', height: "100%", width: "100%" }]}>
                {props.renderItem(props.list[prevSelectedItem])}
            </Animated.View>}
            {<Animated.View style={[props.style, showStyle, { position: 'absolute', height: "100%", width: "100%" }]}>
                {item}
            </Animated.View>}
        </View >
    );
}

export function UpDownViewSelector<T extends any>(props: { selectedItem: number, list: T[], renderItem: (item: T) => React.JSX.Element, style?: StyleProp<ViewStyle> }) {
    const [selectedItem, setSelectedItem] = useState(props.selectedItem);
    const [prevSelectedItem, setPrevSelectedItem] = useState(-1);
    const animation = useSharedValue(100);
    const layout = useWindowDimensions();

    const directionDown = selectedItem > prevSelectedItem;
    const hideStyle = useAnimatedStyle(() => ({
        flexWrap: 'nowrap',
        transform: [{
            translateY: directionDown ? interpolate(animation.value, [0, 100], [0, -layout.height]) : interpolate(animation.value, [0, 100], [0, layout.height])
        }],
        opacity: interpolate(animation.value, [0, 100], [1, 0])
    }));

    const showStyle = useAnimatedStyle(() => ({
        flexWrap: 'nowrap',
        transform: [{
            translateY: directionDown ? interpolate(animation.value, [0, 100], [layout.height, 0]) : interpolate(animation.value, [0, 100], [-layout.height, 0])
        }],
        opacity: interpolate(animation.value, [0, 100], [0, 1])
    }));

    useEffect(() => {
        if (selectedItem != props.selectedItem) {
            setPrevSelectedItem(selectedItem);
            setSelectedItem(props.selectedItem);
            animation.value = 0;
        }

        if (prevSelectedItem != -1) {
            animation.value = withTiming(100, {
                duration: 400,
                easing: Easing.inOut(Easing.ease)
            }, (finished) => {
                if (finished) {
                    scheduleOnMainThread(setPrevSelectedItem, -1);
                }
            });
        }
    });

    const item = props.renderItem(props.list[selectedItem]);

    if (prevSelectedItem == -1) {
        return (<View style={props.style}>{item}</View>)
    }

    return (
        <View style={props.style}>
            {prevSelectedItem != -1 && <Animated.View style={[props.style, hideStyle, { position: 'absolute', height: "100%", width: "100%" }]}>
                {props.renderItem(props.list[prevSelectedItem])}
            </Animated.View>}
            {<Animated.View style={[props.style, showStyle, { position: 'absolute', height: "100%", width: "100%" }]}>
                {item}
            </Animated.View>}
        </View >
    );
}

export function DownShowViewSelector<T extends any>(props: { selectedItem: number, list: T[], renderItem: (item: T) => React.JSX.Element, style?: StyleProp<ViewStyle> }) {
    const [selectedItem, setSelectedItem] = useState(props.selectedItem);
    const [prevSelectedItem, setPrevSelectedItem] = useState(-1);
    const animation = useSharedValue(200);
    const layout = useWindowDimensions();

    const hideStyle = useAnimatedStyle(() => ({
        flexWrap: 'nowrap',
        transform: [{
            translateY: animation.value < 100 ? interpolate(animation.value, [0, 100], [0, layout.height], 'clamp') : layout.height
        }],
        opacity: animation.value < 100 ? interpolate(animation.value * 10, [0, 100], [1, 0], 'clamp') : 0,
        display: animation.value < 100 ? undefined : 'none'
    }));

    const showStyle = useAnimatedStyle(() => ({
        flexWrap: 'nowrap',
        opacity: interpolate(animation.value, [100, 200], [0, 1], 'clamp')
    }));


    useEffect(() => {
        if (selectedItem != props.selectedItem) {
            cancelAnimation(animation);

            setPrevSelectedItem(selectedItem);
            setSelectedItem(props.selectedItem);
            animation.value = 0;
        }

        if (prevSelectedItem != -1) {
            animation.value = withSequence(
                withTiming(100, {
                    duration: 900,
                    easing: Easing.inOut(Easing.ease)
                }),
                withTiming(200, {
                    duration: 600,
                    easing: Easing.inOut(Easing.ease)
                }, (finished) => {
                    if (finished) {
                        scheduleOnMainThread(setPrevSelectedItem, -1);
                    }
                })
            );
        }
    });

    const showItem = props.renderItem(props.list[selectedItem]);

    if (prevSelectedItem == -1) {
        return (<View style={props.style}>{showItem}</View>)
    }

    const hideItem = props.renderItem(props.list[prevSelectedItem]);

    return (
        <View style={props.style}>
            <Animated.View style={[props.style, hideStyle, { position: 'absolute', height: "100%", width: "100%" }]}>
                {hideItem}
            </Animated.View>
            <Animated.View style={[props.style, showStyle]}>
                {showItem}
            </Animated.View>
        </View >
    );
}

export function TopViewSelector(props: { view?: React.JSX.Element }) {
    const animation = useSharedValue(0);
    const [prevView, setPrevView] = useState<React.JSX.Element | undefined>(undefined);
    const [currentView, setCurrentView] = useState<React.JSX.Element | undefined>(undefined);

    const hideStyle = useAnimatedStyle(() => ({
        opacity: interpolate(animation.value * 5, [0, 100], [1, 0], 'clamp'),
    }));

    const showStyle = useAnimatedStyle(() => ({
        opacity: interpolate(animation.value, [0, 100], [0, 1], 'clamp'),
    }));


    useEffect(() => {
        if (props.view != currentView) {
            setCurrentView(props.view);
            if (currentView) {
                setPrevView(currentView);
                cancelAnimation(animation);
                animation.value = 0;
            }
        }

        animation.value = withSequence(
            withTiming(100, {
                duration: 500,
                easing: Easing.ease
            }, (finished) => {
                if (finished) {
                    animation.value = 0;
                    scheduleOnMainThread(setPrevView, undefined);
                }
            })
        );
    });

    const backgroundColor = useThemeColor("background");

    if (!prevView) {
        return currentView;
    }

    return (
        <View style={[{ height: "100%", width: "100%", backgroundColor: backgroundColor }]}>
            <Animated.View style={[{ position: 'absolute', height: "100%", width: "100%" }, hideStyle]}>
                {prevView}
            </Animated.View>
            <Animated.View style={[{ opacity: 0, position: 'absolute', height: "100%", width: "100%" }, showStyle]}>
                {currentView}
            </Animated.View>
        </View >
    );
}
