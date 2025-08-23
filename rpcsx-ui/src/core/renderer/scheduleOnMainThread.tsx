import {  Platform } from 'react-native';
import { runOnJS } from 'react-native-reanimated';

export function scheduleOnMainThread<Args extends unknown[], ReturnValue>(cb: ((...args: Args) => ReturnValue), ...args: Args) {
    'worklet';

    if (Platform.OS == 'web') {
        return cb(...args);
    } else {
        return runOnJS(cb)(...args);
    }
}
