import { ComponentProps, ReactElement, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View, FlatList } from 'react-native';
import { useThemeColor } from '$core/useThemeColor'
import { } from '@react-navigation/elements';
import ThemedIcon from '$core/ThemedIcon';
import { ThemedText } from '$core/ThemedText';
import { getIcon, getName } from "$/ExplorerItemUtils"
import { HapticPressable } from '$core/HapticPressable';
import { DownShowViewSelector, LeftRightViewSelector } from '$core/ViewSelector';
import { getLocalizedString } from '$core/Localized';
import * as settings from '$settings';

import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    interpolate,
    withTiming,
    cancelAnimation,
    interpolateColor,
} from 'react-native-reanimated';
import { useColorScheme } from '$core/useColorScheme';


const games: (ExecutableInfo & ExplorerItem)[] = [
    {
        type: 'game',
        executable: "test-executable",
        launcher: {
            type: "test-launcher",
            requirements: {}
        },
        description: [
            {
                text: "Test Game"
            }
        ],
        name: [
            {
                text: "Test Game"
            }
        ],
        version: "0.1"
    },
    {
        type: 'game',
        executable: "test-executable",
        launcher: {
            type: "test-launcher",
            requirements: {}
        },
        description: [
            {
                text: "Test Game"
            }
        ],
        name: [
            {
                text: "Test Game"
            }
        ],
        version: "0.1"
    },
    {
        type: 'game',
        executable: "test-executable",
        launcher: {
            type: "test-launcher",
            requirements: {}
        },
        description: [
            {
                text: "Test Game"
            }
        ],
        name: [
            {
                text: "Test Game"
            }
        ],
        version: "0.1"
    },
];
const extensions: (ExtensionInfo & ExplorerItem)[] = [
    {
        type: 'extension',
        executable: "test-executable",
        launcher: {
            type: "test-launcher",
            requirements: {}
        },
        name: [{
            text: "Unknown"
        }],
        version: "0.1"
    },
    {
        type: 'extension',
        executable: "test-executable",
        launcher: {
            type: "test-launcher",
            requirements: {}
        },
        name: [{
            text: "Unknown"
        }],
        version: "0.1"
    },
    {
        type: 'extension',
        executable: "test-executable",
        launcher: {
            type: "test-launcher",
            requirements: {}
        },
        name: [{
            text: "Unknown"
        }],
        version: "0.1"
    },
    {
        type: 'extension',
        executable: "test-executable",
        launcher: {
            type: "test-launcher",
            requirements: {}
        },
        name: [{
            text: "Unknown"
        }],
        version: "0.1"
    },
    {
        type: 'extension',
        executable: "test-executable",
        launcher: {
            type: "test-launcher",
            requirements: {}
        },
        name: [{
            text: "Unknown"
        }],
        version: "0.1"
    },
    {
        type: 'extension',
        executable: "test-executable",
        launcher: {
            type: "test-launcher",
            requirements: {}
        },
        name: [{
            text: "Unknown"
        }],
        version: "0.1"
    },
    {
        type: 'extension',
        executable: "test-executable",
        launcher: {
            type: "test-launcher",
            requirements: {}
        },
        name: [{
            text: "Unknown"
        }],
        version: "0.1"
    },
    {
        type: 'extension',
        executable: "test-executable",
        launcher: {
            type: "test-launcher",
            requirements: {}
        },
        name: [{
            text: "Unknown"
        }],
        version: "0.1"
    },
    {
        type: 'extension',
        executable: "test-executable",
        launcher: {
            type: "test-launcher",
            requirements: {}
        },
        name: [{
            text: "Unknown"
        }],
        version: "0.1"
    },
    {
        type: 'extension',
        executable: "test-executable",
        launcher: {
            type: "test-launcher",
            requirements: {}
        },
        name: [{
            text: "Unknown"
        }],
        version: "0.1"
    },
    {
        type: 'extension',
        executable: "test-executable",
        launcher: {
            type: "test-launcher",
            requirements: {}
        },
        name: [{
            text: "Unknown"
        }],
        version: "0.1"
    }
];

type ScreenTabProps = {
    active: boolean;
    title: string;
};

const AnimatedThemedText = Animated.createAnimatedComponent(ThemedText);

function ScreenTab(props: Omit<ComponentProps<typeof HapticPressable>, "children"> & ScreenTabProps) {
    const [activeState, setActiveState] = useState(props.active);
    const animation = useSharedValue(props.active ? 100 : 0);

    const animatedStyle = useAnimatedStyle(() => ({
        fontSize: interpolate(animation.value, [0, 100], [28, 32]),
        lineHeight: interpolate(animation.value, [0, 100], [24, 24]),
        opacity: interpolate(animation.value, [0, 100], [0.6, 1]),
    }));


    useEffect(() => {
        if (activeState != props.active) {
            setActiveState(props.active);
            cancelAnimation(animation);
        }

        animation.value = withTiming(props.active ? 100 : 0, {
            duration: 400,
            easing: Easing.out(Easing.exp)
        });
    });

    return (
        <HapticPressable
            {...props}
            children={
                <AnimatedThemedText
                    type='title'
                    style={animatedStyle}>
                    {props.title}
                </AnimatedThemedText>
            }
        />
    );
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ExplorerItemHeader({ item, active, ...rest }: { item: ExplorerItem, active: boolean, } & ComponentProps<typeof Pressable>) {
    const [activeState, setActiveState] = useState(active);
    const animation = useSharedValue(active ? 100 : 0);

    const activeBackground = useThemeColor("primaryContainer");
    const inactiveBackground = useThemeColor("surfaceContainer");

    useEffect(() => {
        if (activeState != active) {
            setActiveState(active);
            cancelAnimation(animation);
        }

        animation.value = withTiming(active ? 100 : 0, {
            duration: 500,
            easing: Easing.out(Easing.exp)
        });
    });

    const buttonsContainerStyle = useAnimatedStyle(() => ({
        height: "100%",
        width: "100%",
        alignItems: 'center',
        alignSelf: 'center',
        justifyContent: 'center',
        flexWrap: 'nowrap',
        backgroundColor: interpolateColor(animation.value, [0, 100], [inactiveBackground, activeBackground])
    }));


    const icon = getIcon(item);

    const styles = StyleSheet.create({
        image: {
            flexDirection: 'column',
            alignItems: 'center',
            alignSelf: 'center',
            justifyContent: 'center',
            flexWrap: 'nowrap',
            height: "100%",
            minWidth: 100,
        },
    });

    return <AnimatedPressable style={buttonsContainerStyle} {...rest}>
        {icon ? <Image source={{ uri: icon }} style={styles.image} resizeMethod='scale' resizeMode='contain' /> :
            <View style={styles.image}><ThemedIcon iconSet="Ionicons" name="extension-puzzle-sharp" size={100} /><ThemedText>{getName(item)}</ThemedText></View>
        }
    </AnimatedPressable>
}

function ExplorerItemBody({ item }: { item: ExplorerItem }) {
    return (<Animated.ScrollView style={{ margin: 80, flex: 1, flexGrow: 5 }}>
        {item.description && <ThemedText type='subtitle'>{item.description && getLocalizedString(item.description)}</ThemedText>}
    </Animated.ScrollView>)
}

function ExplorerView({ items }: { items: ExplorerItem[] }) {
    const styles = StyleSheet.create({
        topContainer: {
            flex: 1,
            flexGrow: 1,
        },
        scrollContainer: {
            flex: 1,
            flexGrow: 1,
            marginHorizontal: 60,
        },
        scrollContentContainer: {
        },
        descriptionContainer: {
            flex: 1,
            flexGrow: 1,
            flexDirection: 'column',
        }
    });

    const [selectedItem, selectItem] = useState(0);

    return (
        <View style={styles.topContainer}>
            <ScrollView style={styles.descriptionContainer} showsVerticalScrollIndicator={false}>
                <FlatList data={items} style={styles.scrollContainer} contentContainerStyle={styles.scrollContentContainer} horizontal={true} showsHorizontalScrollIndicator={false} renderItem={
                    ({ item, index }) => {
                        const name = getName(item);
                        return <ExplorerItemHeader key={index + name + item.type + item.version} item={item} style={{ margin: 30 }} onPress={() => selectItem(index)} active={index == selectedItem}></ExplorerItemHeader>
                    }
                }>
                </FlatList>

                <DownShowViewSelector list={items} renderItem={item => <ExplorerItemBody item={item} />} selectedItem={selectedItem} />
            </ScrollView>
        </View>
    );
}

type Screen = {
    title: string;
    view: (setBackgroundImage: (image: string | undefined) => void) => ReactElement;
}

type Props = {
    layout?: "list" | "grid";
    filter?: ExplorerItemFilter;
    sort?: Partial<ExplorerItem>;
    sortAsc?: boolean;
};

const ExplorerStyles = StyleSheet.create({
    rootContainer: { height: "100%", width: "100%" },
    menuContainer: {
        flexDirection: 'row',
        minHeight: 50,
        marginLeft: 60,
        marginRight: 40,
        marginTop: 60
    },
    containerButtons: {
        flexDirection: 'column',
        flex: 1,
        alignItems: 'flex-end',
        flexGrow: 1,
        gap: 40,
    },
    containerMenuItems: {
        flexDirection: 'row',
        flex: 1,
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 40,
    },
    containerTabs: {
        flexDirection: 'column',
        flex: 1,
        flexGrow: 1,
        justifyContent: 'flex-start',
        alignItems: 'flex-start',
        gap: 40,
    },
    contentContainer: {
        flexDirection: 'row',
        flexGrow: 1,
        flex: 1,
        margin: 40,
    },
});

const screens: Screen[] = [
    {
        title: "Games",
        view: () => <ExplorerView items={games} />
    },
    {
        title: "Extensions",
        view: () => <ExplorerView items={extensions} />
    }
];

export function Explorer(props?: Props) {
    const [background, setBackground] = useState<string | undefined>(undefined);
    const [activeTab, setActiveTab] = useState(1);
    const theme = useColorScheme();

    return (
        <View style={[ExplorerStyles.rootContainer, { backgroundColor: theme == 'dark' ? "black" : "white", backgroundImage: background }]}>
            <View style={ExplorerStyles.menuContainer}>
                <View style={ExplorerStyles.containerTabs}>
                    <View style={ExplorerStyles.containerMenuItems}>
                        {
                            screens.map((screen, index) =>
                                <ScreenTab key={screen.title} title={screen.title} active={activeTab == index} onPress={() => setActiveTab(index)} />
                            )
                        }
                    </View>
                </View>
                <View style={ExplorerStyles.containerButtons}>
                    <View style={ExplorerStyles.containerMenuItems}>
                        <HapticPressable><ThemedIcon iconSet="Ionicons" name="search" size={40} /></HapticPressable>
                        <HapticPressable onPress={() => settings.pushSettingsView({})}><ThemedIcon iconSet="Ionicons" name="settings-outline" size={40} /></HapticPressable>
                        <HapticPressable><ThemedIcon iconSet="FontAwesome6" name="user" size={40} /></HapticPressable>
                    </View>
                </View>
            </View>

            <LeftRightViewSelector list={screens} style={{ flex: 1, flexGrow: 1 }} renderItem={item => item.view((image) => setBackground(image))} selectedItem={activeTab} />
        </View>
    )
}


