import { useEffect, useState } from 'react';
import { StyleProp, View, ViewStyle, useWindowDimensions } from 'react-native';

import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    interpolate,
    withTiming,
    withSequence,
    FadeIn,
    FadeOut,
} from 'react-native-reanimated';
import { useThemeColor } from './useThemeColor';

type SelectorState = {
    views: (React.JSX.Element | undefined)[];
    index: number;
    itemIndex: number[];
};

export function LeftRightViewSelector<T extends any>(props: { selectedItem: number, list: T[], renderItem: (item: T) => React.JSX.Element, style?: StyleProp<ViewStyle> }) {
    const layout = useWindowDimensions();

    function activate() {
        return withTiming(100, {
            duration: 400,
            easing: Easing.inOut(Easing.ease)
        });
    }

    function createHideStyle(directionRight: boolean, animationValue: number): ViewStyle {
        'worklet';

        return {
            transform: [{
                translateX: directionRight ? interpolate(animationValue, [0, 100], [0, -layout.width]) : interpolate(animationValue, [0, 100], [0, layout.width])
            }],
            opacity: interpolate(animationValue, [0, 100], [1, 0]),
            zIndex: 0
        };
    }

    function createShowStyle(directionRight: boolean, animationValue: number): ViewStyle {
        'worklet';
        return {
            transform: [{
                translateX: directionRight ? interpolate(animationValue, [0, 100], [layout.width, 0]) : interpolate(animationValue, [0, 100], [-layout.width, 0])
            }],
            opacity: interpolate(animationValue, [0, 100], [0, 1]),
            zIndex: 1
        };
    }

    const animation = useSharedValue(100);

    const [state, setState] = useState<SelectorState>({
        views: [props.selectedItem >= 0 ? props.renderItem(props.list[props.selectedItem]) : undefined, undefined],
        index: 0,
        itemIndex: [props.selectedItem >= 0 ? props.selectedItem : -1, -1]
    });

    const [indexIncreased, setIndexIncreased] = useState<boolean>(false);
    const prevItemIndex = state.itemIndex[state.index];

    useEffect(() => {
        if (props.selectedItem != prevItemIndex) {
            if (state.itemIndex[0] >= 0) {
                setIndexIncreased(props.selectedItem > prevItemIndex);
                animation.value = 0;
                animation.value = activate();
            }

            const nextRenderIndex = (state.index + 1) & 1;
            state.views[nextRenderIndex] = props.renderItem(props.list[props.selectedItem]);
            state.itemIndex[nextRenderIndex] = props.selectedItem;

            setState({
                views: state.views,
                index: nextRenderIndex,
                itemIndex: state.itemIndex,
            });
        }

    }, [props.selectedItem]);

    const waitAnimation = props.selectedItem != state.itemIndex[state.index];

    const hideStyle = useAnimatedStyle(() => createHideStyle(indexIncreased, waitAnimation ? 0 : animation.value));
    const showStyle = useAnimatedStyle(() => createShowStyle(indexIncreased, waitAnimation ? 0 : animation.value));

    const drawIndex = waitAnimation ? 1 - state.index : state.index;

    const styles = [
        drawIndex == 0 ? showStyle : hideStyle,
        drawIndex == 1 ? showStyle : hideStyle,
    ];

    const staticStyle: StyleProp<ViewStyle> = { position: 'absolute', height: "100%", width: "100%" };

    return (
        <View style={props.style}>
            <Animated.View style={[styles[0], staticStyle]}>
                {state.views[0]}
            </Animated.View>
            <Animated.View style={[styles[1], staticStyle]}>
                {state.views[1]}
            </Animated.View>
        </View >
    );
}

export function UpDownViewSelector<T extends any>(props: { selectedItem: number, list: T[], renderItem: (item: T) => React.JSX.Element, style?: StyleProp<ViewStyle> }) {
    const layout = useWindowDimensions();

    function activate() {
        return withTiming(100, {
            duration: 400,
            easing: Easing.inOut(Easing.ease)
        });
    }

    function createHideStyle(directionDown: boolean, animationValue: number): ViewStyle {
        'worklet';
        const y = directionDown ? interpolate(animationValue, [0, 100], [0, -layout.height]) : interpolate(animationValue, [0, 100], [0, layout.height]);

        return {
            transform: [{
                translateY: y
            }],
            height: Math.max(layout.height, layout.height - y),
            opacity: interpolate(animationValue, [0, 100], [1, 0]),
            zIndex: 0
        };
    }

    function createShowStyle(directionDown: boolean, animationValue: number): ViewStyle {
        'worklet';
        const y = directionDown ? interpolate(animationValue, [0, 100], [layout.height, 0]) : interpolate(animationValue, [0, 100], [-layout.height, 0]);
        return {
            transform: [{
                translateY: y
            }],
            height: Math.max(layout.height, y + layout.height),
            opacity: interpolate(animationValue, [0, 100], [0, 1]),
            zIndex: 1
        };
    }

    const animation = useSharedValue(100);

    const [state, setState] = useState<SelectorState>({
        views: [props.selectedItem >= 0 ? props.renderItem(props.list[props.selectedItem]) : undefined, undefined],
        index: 0,
        itemIndex: [props.selectedItem >= 0 ? props.selectedItem : -1, -1]
    });

    const [indexIncreased, setIndexIncreased] = useState<boolean>(false);
    const prevItemIndex = state.itemIndex[state.index];

    useEffect(() => {
        if (props.selectedItem != prevItemIndex) {
            if (state.itemIndex[0] >= 0) {
                setIndexIncreased(props.selectedItem > prevItemIndex);
                animation.value = 0;
                animation.value = activate();
            }

            const nextRenderIndex = (state.index + 1) & 1;
            state.views[nextRenderIndex] = props.renderItem(props.list[props.selectedItem]);
            state.itemIndex[nextRenderIndex] = props.selectedItem;

            setState({
                views: state.views,
                index: nextRenderIndex,
                itemIndex: state.itemIndex,
            });
        }

    }, [props.selectedItem]);

    const waitAnimation = props.selectedItem != state.itemIndex[state.index];

    const hideStyle = useAnimatedStyle(() => createHideStyle(indexIncreased, waitAnimation ? 0 : animation.value));
    const showStyle = useAnimatedStyle(() => createShowStyle(indexIncreased, waitAnimation ? 0 : animation.value));

    const drawIndex = waitAnimation ? 1 - state.index : state.index;

    const styles = [
        drawIndex == 0 ? showStyle : hideStyle,
        drawIndex == 1 ? showStyle : hideStyle,
    ];

    const staticStyle: StyleProp<ViewStyle> = { position: 'absolute', height: "100%", width: "100%" };

    return (
        <View style={props.style}>
            <Animated.View style={[styles[0], staticStyle]}>
                {state.views[0]}
            </Animated.View>
            <Animated.View style={[styles[1], staticStyle]}>
                {state.views[1]}
            </Animated.View>
        </View >
    );
}

export function DownShowViewSelector<T extends any>(props: { selectedItem: number, list: T[], renderItem: (item: T) => React.JSX.Element, style?: StyleProp<ViewStyle> }) {
    const layout = useWindowDimensions();

    function activate() {
        return withSequence(
            withTiming(50, {
                duration: 900,
                easing: Easing.inOut(Easing.ease)
            }),
            withTiming(100, {
                duration: 600,
                easing: Easing.inOut(Easing.ease)
            })
        );
    }

    function createHideStyle(_indexIncreased: boolean, animationValue: number): ViewStyle {
        'worklet';

        return {
            transform: [{
                translateY: interpolate(animationValue, [0, 50], [0, layout.height], 'clamp')
            }],
            opacity: interpolate(animationValue * 10, [0, 50], [1, 0], 'clamp'),
            zIndex: 0,
        };
    }

    function createShowStyle(_indexIncreased: boolean, animationValue: number): ViewStyle {
        'worklet';

        return {
            transform: [{
                translateY: 0
            }],
            opacity: interpolate(animationValue, [50, 100], [0, 1], 'clamp'),
            zIndex: 1,
        };
    }

    const animation = useSharedValue(100);

    const [state, setState] = useState<SelectorState>({
        views: [props.selectedItem >= 0 ? props.renderItem(props.list[props.selectedItem]) : undefined, undefined],
        index: 0,
        itemIndex: [props.selectedItem >= 0 ? props.selectedItem : -1, -1]
    });

    const [indexIncreased, setIndexIncreased] = useState<boolean>(false);
    const prevItemIndex = state.itemIndex[state.index];

    useEffect(() => {
        if (props.selectedItem != prevItemIndex) {
            if (state.itemIndex[0] >= 0) {
                setIndexIncreased(props.selectedItem > prevItemIndex);
                animation.value = 0;
                animation.value = activate();
            }

            const nextRenderIndex = (state.index + 1) & 1;
            state.views[nextRenderIndex] = props.renderItem(props.list[props.selectedItem]);
            state.itemIndex[nextRenderIndex] = props.selectedItem;

            setState({
                views: state.views,
                index: nextRenderIndex,
                itemIndex: state.itemIndex,
            });
        }

    }, [props.selectedItem]);

    const waitAnimation = props.selectedItem != state.itemIndex[state.index];

    const hideStyle = useAnimatedStyle(() => createHideStyle(indexIncreased, waitAnimation ? 0 : animation.value));
    const showStyle = useAnimatedStyle(() => createShowStyle(indexIncreased, waitAnimation ? 0 : animation.value));

    const drawIndex = waitAnimation ? 1 - state.index : state.index;

    const styles = [
        drawIndex == 0 ? showStyle : hideStyle,
        drawIndex == 1 ? showStyle : hideStyle,
    ];

    const staticStyle: StyleProp<ViewStyle> = { position: 'absolute', height: "100%", width: "100%" };

    return (
        <View style={props.style}>
            <Animated.View style={[styles[0], staticStyle]}>
                {state.views[0]}
            </Animated.View>
            <Animated.View style={[styles[1], staticStyle]}>
                {state.views[1]}
            </Animated.View>
        </View >
    );
}

export function TopViewSelector(props: { stack: React.JSX.Element[], index: number }) {
    const currentView = props.stack[props.index];

    type SelectorState = {
        views: (React.JSX.Element | undefined)[];
        index: number;
    };

    const [state, setState] = useState<SelectorState>({ views: [currentView, undefined], index: currentView == undefined ? -1 : 0 });

    useEffect(() => {
        const nextRenderIndex = (state.index + 1) & 1;
        state.views[nextRenderIndex] = currentView;

        setState({
            views: state.views,
            index: nextRenderIndex
        });
    }, [props.index]);

    const backgroundColor = useThemeColor("background");
    const style: StyleProp<ViewStyle> = { height: "100%", width: "100%" };

    return (
        <View style={{ backgroundColor, flex: 1 }}>
            {state.index == 0 && <Animated.View entering={FadeIn} exiting={FadeOut} style={style}>
                {state.views[0]}
            </Animated.View>}
            {state.index == 1 && <Animated.View entering={FadeIn} exiting={FadeOut} style={style}>
                {state.views[1]}
            </Animated.View>}
        </View>
    )
};
