import { useThemeColorOr } from './useThemeColor';
import { ComponentProps } from 'react';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';

const iconSets = {
    FontAwesome6,
    Ionicons,
    MaterialIcons
};

export default function ThemedIcon<IconSet extends keyof typeof iconSets>({ color, iconSet, ...rest }: Omit<ComponentProps<typeof iconSets[IconSet]>, "color"> & { color?: ThemedColor, iconSet: IconSet }) {
    const resultColor = useThemeColorOr(color ?? {}, "text");

    const Component = iconSets[iconSet] as any;
    return (
        <Component
            style={[
                { color: resultColor },
            ]}
            {...rest}
        />
    );
}
