import { ComponentProps, memo, useEffect, useRef, useState } from 'react';
import * as React from 'react';
import { Image, Pressable, ScrollView, StyleSheet, View, FlatList, Modal, useWindowDimensions, ImageBackground } from 'react-native';
import { useThemeColor } from '$core/useThemeColor'
import ThemedIcon from '$core/ThemedIcon';
import { ThemedText } from '$core/ThemedText';
import { getIcon, getName, getLocalizedImage } from "$/ExplorerItemUtils"
import { HapticPressable } from '$core/HapticPressable';
import { DownShowViewSelector, LeftRightViewSelector } from '$core/ViewSelector';
import { getLocalizedString } from '$core/Localized';
import * as settings from '$settings';
import * as self from '$explorer';

import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    interpolate,
    withTiming,
    cancelAnimation,
    interpolateColor,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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

const ScreenTab = memo(function (props: Omit<ComponentProps<typeof HapticPressable>, "children"> & ScreenTabProps) {
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
});

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const ExplorerItemHeader = memo(function ({ item, active, ...rest }: { item: ExplorerItem, active: boolean, } & ComponentProps<typeof Pressable>) {
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
            minWidth: 250,
            minHeight: 100
        },
    });

    return <AnimatedPressable style={buttonsContainerStyle} {...rest}>
        {icon ? <Image source={{ uri: icon }} style={styles.image} resizeMethod='scale' resizeMode='contain' /> :
            <View style={styles.image}><ThemedIcon iconSet="Ionicons" name="extension-puzzle-sharp" size={100} /><ThemedText>{getName(item)}</ThemedText></View>
        }
    </AnimatedPressable>
});

function MainActionButton(props: { text: string }) {
    const surfaceColor = useThemeColor('surfaceBright');
    const outlineColor = useThemeColor('outline');

    const style = StyleSheet.create({
        container: {
            flex: 1,
            borderRadius: 30,
            maxWidth: 300,
            height: 60,
            alignItems: 'center',
            justifyContent: 'center'
        }
    });

    return <Pressable style={[style.container, { borderColor: outlineColor, backgroundColor: surfaceColor }]}>
        <ThemedText style={{ fontSize: 20 }}>{props.text}</ThemedText>
    </Pressable>
}

function AdditionalActionsButton(props: {}) {
    const surfaceColor = useThemeColor('surfaceBright');
    const textColor = useThemeColor('text');
    const outlineColor = useThemeColor('outline');
    const surfaceContainerColor = useThemeColor("surfaceContainer");
    const [visible, setVisible] = useState(false);
    const pressableRef = useRef<View>(null);
    const modalRef = useRef<View>(null);
    const [dotsLayout, setDotsLayout] = useState({ x: 0, y: 0, width: 0, height: 0 });
    const [modalLayout, setModalLayout] = useState({ width: 0, height: 0 });
    const insets = useSafeAreaInsets();
    const layout = useWindowDimensions();

    const styles = StyleSheet.create({
        container: {
            flexDirection: 'row',
            borderRadius: 30,
            width: 60,
            height: 60,
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            gap: 5,
        },
        dot: {
            borderRadius: 30,
            width: 6,
            height: 6
        },
        modalOverlay: {
            flex: 1,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            paddingHorizontal: 20,
        }
    });

    useEffect(() => {
        if (visible) {
            fetchLayouts();
        }
    });

    const fetchLayouts = () => {
        pressableRef.current?.measureInWindow((x, y, width, height) => {
            width = Math.ceil(width);
            height = Math.ceil(height);
            x = Math.ceil(x);
            y = Math.ceil(y);

            if (dotsLayout.x != x || dotsLayout.y != y || dotsLayout.width != width || dotsLayout.height != height) {
                setDotsLayout({ x, y, width, height });
            }
        });

        modalRef.current?.measureInWindow((_x, _y, width, height) => {
            width = Math.ceil(width);
            height = Math.ceil(height);

            if (modalLayout.width != width || modalLayout.height != height) {
                console.log(modalLayout.width, modalLayout.height, width, height);
                setModalLayout({ width, height });
            }
        });
    };

    const toggleModal = () => {
        setVisible(!visible);
        if (!visible) {
            fetchLayouts();
        }
    };

    const modalPosition = (() => {
        let x = dotsLayout.x + dotsLayout.width;
        let y = dotsLayout.y;

        if (x + modalLayout.width > layout.width - insets.right) {
            y -= modalLayout.height + 10;
            x -= (x + modalLayout.width) - (layout.width - insets.right);
        }

        if (y + modalLayout.height > layout.height - insets.bottom) {
            // y -= (y + modalLayout.height) - (layout.height - insets.bottom);
            y -= modalLayout.height / 2;
        }

        return { x, y };
    })();

    const actions = [
        { "title": "Play on ..." },
        { "title": "Install" },
        { "title": "Download" },
        { "title": "Delete" },
    ];

    return (
        <View>
            <Pressable ref={pressableRef} onPress={toggleModal} style={[styles.container, { borderColor: outlineColor, backgroundColor: surfaceColor }]}>
                <View style={[styles.dot, { backgroundColor: textColor }]} />
                <View style={[styles.dot, { backgroundColor: textColor }]} />
                <View style={[styles.dot, { backgroundColor: textColor }]} />
            </Pressable>

            <Modal transparent animationType="fade" visible={visible}>
                <Pressable style={[styles.modalOverlay]} onPress={toggleModal}>
                    <View ref={modalRef} style={{ padding: 3, width: 300, backgroundColor: surfaceContainerColor, transform: [{ translateX: modalPosition.x }, { translateY: modalPosition.y }] }}>
                        {
                            actions.map((action) => {
                                return (
                                    <Pressable key={action.title} style={{ padding: 10 }}>
                                        <ThemedText style={{ fontSize: 20 }}>{action.title}</ThemedText>
                                    </Pressable>
                                )
                            })
                        }
                    </View>
                </Pressable>
            </Modal>
        </View>
    );
}

function ActionsView(props: { actions?: JsonObject }) {
    const style = StyleSheet.create({
        container: {
            flexDirection: 'row',
            gap: 40,
            margin: 40,
            alignItems: 'center',
            justifyContent: 'flex-start'
        }
    });

    return props.actions && <View style={style.container}>
        {<MainActionButton text={getActionTitle(Object.values(props.actions)[0])} />}
        {Object.values(props.actions).length > 1 && <AdditionalActionsButton />}
    </View>
}

function getActionTitle(action: Json) {
    if (action && typeof action == "object") {
        if ("title" in action && typeof action.title == 'string') {
            return action.title;
        }
    }

    return "<no title>"
}

const ExplorerItemBody = memo(function ({ item }: { item: ExplorerItem }) {
    return (
        <View>
            {item.description && <ThemedText type='subtitle'>{item.description && getLocalizedString(item.description)}</ThemedText>}
            <ActionsView actions={item.actions} />
        </View>
    )
});

const ExplorerView = function ({ items, setBackground }: { items: ExplorerItem[], setBackground: (uri?: string) => void }) {
    const styles = StyleSheet.create({
        topContainer: {
            width: "100%",
            height: "100%",
            flexDirection: 'column',
        },
        scrollContainer: {
            width: "100%",
        }
    });

    const [selectedItem, setSelectedItem] = useState(0);

    const selectItem = (index: number) => {
        setSelectedItem(index);

        setBackground(items[index].background ? getLocalizedImage(items[index].background) : undefined);
    };

    return (
        <View style={styles.topContainer}>
            {items.length > 0 &&
                <ScrollView showsVerticalScrollIndicator={false}>
                    <FlatList data={items} style={styles.scrollContainer} horizontal={true} showsHorizontalScrollIndicator={false} renderItem={
                        ({ item, index }) => {
                            const name = getName(item);
                            return <ExplorerItemHeader key={index + name + item.type + item.version} item={item} style={{ margin: 20 }} onPress={() => selectItem(index)} active={index == selectedItem}></ExplorerItemHeader>
                        }
                    }>
                    </FlatList>
                    <DownShowViewSelector
                        list={items}
                        renderItem={item => <ExplorerItemBody item={item} />}
                        selectedItem={selectedItem} />
                </ScrollView>
            }
        </View>
    );
};

type Props = {
    layout?: "list" | "grid";
    filter?: ExplorerItemFilter;
    sort?: Partial<ExplorerItem>;
    sortAsc?: boolean;
};

const ExplorerStyles = StyleSheet.create({
    rootContainer: {
        width: "100%",
        height: "100%"
    },
    headerContainer: {
        flex: 1,
    },
    menuContainer: {
        flexDirection: 'row',
        paddingTop: 60,
        paddingLeft: 20,
        paddingRight: 20,
        marginBottom: 10,
        justifyContent: 'space-between'
    },
    containerTabs: {
        flexShrink: 4,
        flexDirection: 'column',
        justifyContent: 'center'
    },
    containerButtons: {
        flexShrink: 1,
        flexWrap: 'wrap',
        flexDirection: 'column',
        justifyContent: 'center',
    },
    containerTabItems: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'flex-start',
        flexWrap: 'wrap',
        gap: 30,
    },
    containerButtonItems: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
        flexWrap: 'nowrap',
        gap: 30,
    },
    contentContainer: {
        marginLeft: 10,
        marginRight: 10,
        marginBottom: 10,
        flex: 1,
    },
});

export function Explorer(props?: Props) {
    const insets = useSafeAreaInsets();
    const [background, setBackground] = useState<string | undefined>(undefined);
    const [activeTab, setActiveTab] = useState(0);
    const [games, setGames] = useState<ExplorerItem[]>([]);
    const [updateId, setUpdateId] = useState(0);

    const safeArea = StyleSheet.create({
        header: {
            paddingTop: Math.max(ExplorerStyles.menuContainer.paddingTop - insets.top / 3, insets.top),
            paddingLeft: Math.max(ExplorerStyles.menuContainer.paddingLeft - insets.left / 3, insets.left),
            paddingRight: Math.max(ExplorerStyles.menuContainer.paddingRight - insets.right / 3, insets.right),
        },
        content: {
            marginLeft: Math.max(ExplorerStyles.contentContainer.marginLeft - insets.left / 3, insets.left),
            marginRight: Math.max(ExplorerStyles.contentContainer.marginRight - insets.right / 3, insets.right),
            marginBottom: Math.max(ExplorerStyles.contentContainer.marginBottom - insets.bottom / 3, insets.bottom),
        }
    });

    useEffect(() => {
        self.onExplorerItems(event => {
            games.push(...event.items.filter(item => item.type == 'game'));
            setGames(games);
            if (updateId == 0) {
                setUpdateId(updateId + 1);
            }
            console.log("received items", event.items.length, games.length);
        });

        if (games.length == 0) {
            self.explorerGet({});
        }
    }, []);

    const updateActiveTab = (tab: number) => {
        setActiveTab(tab);
        setBackground(undefined);
    };

    const screens = [
        {
            title: "Games",
            view: games
        },
        {
            title: "Extensions",
            view: extensions
        }
    ];

    return (
        <ImageBackground source={{ uri: background }} style={{ width: "100%", height: "100%" }} resizeMode="cover">
            <View style={[ExplorerStyles.rootContainer]}>
                <View style={[ExplorerStyles.menuContainer, safeArea.header]}>
                    <View style={ExplorerStyles.containerTabs}>
                        <View style={ExplorerStyles.containerTabItems}>
                            {
                                screens.map((screen, index) =>
                                    <ScreenTab key={screen.title} title={screen.title} active={activeTab == index} onPress={() => updateActiveTab(index)} />
                                )
                            }
                        </View>
                    </View>
                    <View style={[ExplorerStyles.containerButtons]}>
                        <View style={ExplorerStyles.containerButtonItems}>
                            <HapticPressable><ThemedIcon iconSet="Ionicons" name="search" size={40} /></HapticPressable>
                            <HapticPressable onPress={() => settings.pushSettingsView({})}><ThemedIcon iconSet="Ionicons" name="settings-outline" size={40} /></HapticPressable>
                            <HapticPressable><ThemedIcon iconSet="FontAwesome6" name="user" size={40} /></HapticPressable>
                        </View>
                    </View>
                </View>

                <LeftRightViewSelector key={updateId} list={screens} style={[ExplorerStyles.contentContainer, safeArea.content]} renderItem={item =>
                    <ExplorerView items={item.view} setBackground={setBackground} />} selectedItem={activeTab} />
            </View>
        </ImageBackground>
    )
};


