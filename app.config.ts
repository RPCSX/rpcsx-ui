import { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
    ...config,
    name: "RPCSX",
    slug: "rpcsx-ui",
    version: "0.1.0",
    icon: "rpcsx-ui/assets/images/icon.png",
    scheme: "rpcsx",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
        supportsTablet: true,
        bundleIdentifier: "net.rpcsx"
    },
    android: {
        adaptiveIcon: {
            foregroundImage: "rpcsx-ui/assets/images/icon.png",
            backgroundColor: "#ffffff"
        },
        edgeToEdgeEnabled: true,
        package: "net.rpcsx.next"
    },
    web: {
        bundler: "metro",
        output: "single",
        favicon: "rpcsx-ui/assets/images/favicon.png"
    },
    plugins: [
        "expo-asset",
        "expo-font",
        "expo-router",
        "expo-web-browser",
        [
            "expo-splash-screen",
            {
                "image": "rpcsx-ui/assets/images/icon.png",
                "imageWidth": 300,
                "resizeMode": "contain",
                "backgroundColor": "#ffffff"
            }
        ],
        [
            "expo-document-picker",
            {
                "iCloudContainerEnvironment": "Production"
            }
        ],
        [
            "expo-dev-client",
            {
                "launchMode": "most-recent"
            }
        ]
    ],
    experiments: {
        typedRoutes: true,
    }
});
