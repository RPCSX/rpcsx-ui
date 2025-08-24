import '@expo/metro-runtime';
import * as bridge from './bridge';
import { TopViewSelector } from './ViewSelector';
import * as SplashScreen from 'expo-splash-screen';
import { BackHandler } from 'react-native';
import { useState, useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { registerRootComponent } from 'expo';

// import { Asset } from 'expo-asset';

SplashScreen.preventAutoHideAsync();

let onViewChangeCb: (() => void) | undefined;
let viewStack: React.JSX.Element[] = [];
let views: Record<string, (...props: any[]) => React.JSX.Element>;
let serverInitializationPromise: Promise<void>;

function update() {
    if (onViewChangeCb) {
        onViewChangeCb();
    }
}

function renderView(name: string, props: any) {
    const View = views[name];
    return <View key={name} {...props} />;
}

function viewPush(name: string, props: any) {
    if (viewStack.length == 0) {
        SplashScreen.hideAsync();
    }

    viewStack.push(renderView(name, props));
    update();
}

function viewSet(name: string, props: any) {
    viewStack = [renderView(name, props)];
    update();
}

function viewPop() {
    if (viewStack.length < 2) {
        return false;
    }

    viewStack.pop();
    update();
    return true;
}

export function main(
    builtinViews: Record<string, (...props: any[]) => React.JSX.Element>,
    initializationPromise: Promise<void>
) {
    views = builtinViews;
    serverInitializationPromise = initializationPromise;

    bridge.onViewPush(viewPush);
    bridge.onViewSet(viewSet);
    bridge.onViewPop(viewPop);

    registerRootComponent(App);
}

function App() {
    const [renderItem, setRenderItem] = useState<number>(viewStack.length - 1);

    useEffect(() => {
        console.log("app entered");
        serverInitializationPromise.then(() => {
            bridge.sendViewInitializationComplete();
            console.log("sent server initialization");
        });
        console.log("app finish");
    }, []);

    useEffect(() => {
        onViewChangeCb = () => {
            if (viewStack.length > 0) {
                const item = viewStack.length - 1;
                if (item != renderItem) {
                    setRenderItem(item);
                }
            }
        };
    });

    useEffect(() => {
        const backAction = () => {
            return viewPop();
        };

        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            backAction
        );

        return () => backHandler.remove();
    }, []);

    return (
        <SafeAreaProvider>
            <TopViewSelector stack={viewStack} index={viewStack.length - 1} />
        </SafeAreaProvider>
    )
}

