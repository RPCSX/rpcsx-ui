import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import Ionicons from '@expo/vector-icons/Ionicons';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { ComponentProps } from 'react';
import { OpaqueColorValue, type StyleProp, type TextStyle } from 'react-native';

export function MaterialIcon({
    name,
    size = 24,
    color,
    style,
}: {
    name: ComponentProps<typeof MaterialIcons>['name'];
    size?: number;
    color: string | OpaqueColorValue;
    style?: StyleProp<TextStyle>;
}) {
    return <MaterialIcons color={color} size={size} name={name} style={style} />;
}

export function Ionicon({
    name,
    size = 24,
    color,
    style,
}: {
    name: ComponentProps<typeof Ionicons>['name'];
    size?: number;
    color: string | OpaqueColorValue;
    style?: StyleProp<TextStyle>;
}) {
    return <Ionicons color={color} size={size} name={name} style={style} />;
}


export function Awesome6({
    name,
    size = 24,
    color,
    style,
}: {
    name: ComponentProps<typeof FontAwesome6>['name'];
    size?: number;
    color: string | OpaqueColorValue;
    style?: StyleProp<TextStyle>;
}) {
    return <FontAwesome6 color={color} size={size} name={name} style={style} />;
}
