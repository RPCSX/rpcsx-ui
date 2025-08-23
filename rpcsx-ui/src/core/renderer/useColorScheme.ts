import { useColorScheme as impl } from 'react-native';

export function useColorScheme() {
    return impl() ?? 'dark';
}
