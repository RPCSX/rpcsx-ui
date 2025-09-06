import { Target } from "./Target";
import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';

export function getDeviceArchitecture() {
    const abis = DeviceInfo.supportedAbisSync();
    const abi = (abis && abis.length > 0) ? abis[0] : 'unknown';
    return abi.includes("arm64") || abi.includes("aarch64") ? "aarch64" : "x64";
}

export const NativeTarget = new Target("elf", getDeviceArchitecture(), Platform.OS);
