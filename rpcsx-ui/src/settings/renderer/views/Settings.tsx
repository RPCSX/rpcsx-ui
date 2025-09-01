import { ComponentProps, memo, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View, Switch, Alert, TextInput, Modal, useWindowDimensions, BackHandler } from 'react-native';
import { useThemeColor } from '$core/useThemeColor'
import ThemedIcon from '$core/ThemedIcon';
import { ThemedText } from '$core/ThemedText';
import { LeftRightViewSelector, UpDownViewSelector } from '$core/ViewSelector';
import { HapticPressable } from '$core/HapticPressable';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as fs from '$fs';
import * as core from '$core';
import { Schema, SchemaObject } from '$core/Schema';
import { createError } from '$core/Error';
import { ErrorCode } from '$core/enums';

import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withTiming,
    cancelAnimation,
    interpolateColor,
} from 'react-native-reanimated';

type SettingsTabProps = {
    active: boolean;
    title: string;
    iconName: string;
    iconSet: 'Ionicons' | 'FontAwesome6' | 'MaterialIcons';
};

const SettingsTab = memo(function (props: Omit<ComponentProps<typeof HapticPressable>, "children"> & SettingsTabProps) {
    const [activeState, setActiveState] = useState(props.active);
    const animation = useSharedValue(props.active ? 100 : 0);

    const activeBackground = useThemeColor("primaryContainer");
    const inactiveBackground = useThemeColor("surfaceContainer");

    const animatedStyle = useAnimatedStyle(() => ({
        backgroundColor: interpolateColor(animation.value, [0, 100], [inactiveBackground, activeBackground]),
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
        >
            <Animated.View style={[styles.settingsTabContainer, animatedStyle]}>
                <ThemedIcon iconSet={props.iconSet} name={props.iconName} size={28} />
                <ThemedText type='defaultSemiBold' style={styles.settingsTabText}>
                    {props.title}
                </ThemedText>
            </Animated.View>
        </HapticPressable>
    );
})

enum SettingItemType {
    Text,
    Toggle,
    Number,
    DateTime,
    Category,
    List,
    SingleSelection,
    MultipleSelection
}

enum SettingTextMode {
    Plain,
    Url,
    Path,
};

enum SettingDateTimeMode {
    Time,
    Date,
};

type SettingItemBaseProps = {
    type: SettingItemType;
    title: string;
    subtitle?: string;
};

type SettingItemWithChevron = { chevron?: boolean; onPress?: () => void; } | {
    chevron: true;
    onPress: () => void;
};

type SettingItemTextProps = SettingItemBaseProps & {
    type: SettingItemType.Text;
    mode?: SettingTextMode;
    value?: string;
    placeholder?: string;
    onTextChange: (value: string) => void;
};

type SettingItemToggleProps = SettingItemBaseProps & SettingItemWithChevron & {
    type: SettingItemType.Toggle;
    value?: boolean;
    onToggle: (value: boolean) => void;
};

type SettingItemNumberProps = SettingItemBaseProps & {
    type: SettingItemType.Number;
    value?: number;
    placeholder?: string;
    onNumberChange: (value: number) => void;
};

type SettingItemDateTimeProps = SettingItemBaseProps & {
    type: SettingItemType.DateTime;
    value?: Date;
    mode: SettingDateTimeMode;
    onDateChange: (value: Date) => void;
};

type SettingItemCategoryProps = SettingItemBaseProps & SettingItemWithChevron & {
    type: SettingItemType.Category;
};

type SettingItemListProps = SettingItemBaseProps & {
    type: SettingItemType.List;
    mode?: SettingTextMode;
    items: string[];
    onAddItem: (item: string) => void;
    onRemoveItem: (index: number) => void;
    placeholder?: string;
};

type SettingItemSingleSelectionProps = SettingItemBaseProps & {
    type: SettingItemType.SingleSelection;
    options: string[];
    selectedIndex?: number;
    onSelectionChange: (index: number) => void;
};

type SettingItemMultipleSelectionProps = SettingItemBaseProps & {
    type: SettingItemType.MultipleSelection;
    options: string[];
    selectedIndices: number[];
    onSelectionChange: (indices: number[]) => void;
};

type SettingsItemProps =
    SettingItemTextProps |
    SettingItemToggleProps |
    SettingItemNumberProps |
    SettingItemDateTimeProps |
    SettingItemCategoryProps |
    SettingItemListProps |
    SettingItemSingleSelectionProps |
    SettingItemMultipleSelectionProps;

const TextInputModal = memo(function ({ visible, onClose, value, onSave, title, placeholder, mode = SettingTextMode.Plain }: {
    visible: boolean;
    onClose: () => void;
    value: string;
    onSave: (value: string) => void;
    title: string;
    placeholder?: string;
    mode?: SettingTextMode;
}) {
    const [inputValue, setInputValue] = useState(value);
    const surfaceColor = useThemeColor("surface");
    const outlineColor = useThemeColor("outline");
    const surfaceContainerColor = useThemeColor("surfaceContainer");
    const onSurfaceColor = useThemeColor("onSurface");
    const primaryContainerColor = useThemeColor("primaryContainer");
    const onSurfaceVariantColor = useThemeColor("onSurfaceVariant");
    const primaryColor = useThemeColor("primary");
    const onPrimaryColor = useThemeColor("onPrimary");

    const handleSave = () => {
        onSave(inputValue);
        onClose();
    };

    const handlePickFile = async () => {
        try {
            const result = await fs.fsOpenDirectorySelector(undefined);
            setInputValue(result);
        } catch { }
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: surfaceColor, borderColor: outlineColor }]}>
                    <View style={styles.modalHeader}>
                        <ThemedText type="subtitle">{title}</ThemedText>
                        <HapticPressable onPress={onClose} style={styles.modalCloseButton}>
                            <ThemedIcon iconSet="Ionicons" name="close" size={24} />
                        </HapticPressable>
                    </View>

                    <TextInput
                        style={[styles.textInput, { backgroundColor: surfaceContainerColor, borderColor: outlineColor, color: onSurfaceColor }]}
                        value={inputValue}
                        onChangeText={setInputValue}
                        placeholder={placeholder}
                        placeholderTextColor={onSurfaceVariantColor}
                        keyboardType={mode == SettingTextMode.Url ? "url" : "default"}
                        autoCapitalize={mode == SettingTextMode.Url ? "none" : "sentences"}
                        autoCorrect={mode != SettingTextMode.Url}
                    />

                    {mode == SettingTextMode.Path && (
                        <HapticPressable onPress={handlePickFile} style={[styles.filePickerButton, { backgroundColor: primaryContainerColor }]}>
                            <ThemedIcon iconSet="Ionicons" name="folder-outline" size={20} />
                            <ThemedText style={styles.filePickerText}>Browse Files</ThemedText>
                        </HapticPressable>
                    )}

                    <View style={styles.modalButtons}>
                        <HapticPressable onPress={onClose} style={[styles.modalButton, styles.cancelButton]}>
                            <ThemedText>Cancel</ThemedText>
                        </HapticPressable>
                        <HapticPressable onPress={handleSave} style={[styles.modalButton, styles.saveButton, { backgroundColor: primaryColor }]}>
                            <ThemedText style={{ color: onPrimaryColor }}>Save</ThemedText>
                        </HapticPressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
});

const NumberInputModal = memo(function ({ visible, onClose, value, onSave, title, placeholder }: {
    visible: boolean;
    onClose: () => void;
    value: number;
    onSave: (value: number) => void;
    title: string;
    placeholder?: string;
}) {
    const [inputValue, setInputValue] = useState(value.toString());
    const surfaceColor = useThemeColor("surface");
    const outlineColor = useThemeColor("outline");
    const surfaceContainerColor = useThemeColor("surfaceContainer");
    const onSurfaceColor = useThemeColor("onSurface");
    const onSurfaceVariantColor = useThemeColor("onSurfaceVariant");
    const primaryColor = useThemeColor("primary");
    const onPrimaryColor = useThemeColor("onPrimary");


    const handleSave = () => {
        const numValue = parseFloat(inputValue) || 0;
        onSave(numValue);
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: surfaceColor, borderColor: outlineColor }]}>
                    <View style={styles.modalHeader}>
                        <ThemedText type="subtitle">{title}</ThemedText>
                        <HapticPressable onPress={onClose} style={styles.modalCloseButton}>
                            <ThemedIcon iconSet="Ionicons" name="close" size={24} />
                        </HapticPressable>
                    </View>

                    <TextInput
                        style={[styles.textInput, { backgroundColor: surfaceContainerColor, borderColor: outlineColor, color: onSurfaceColor }]}
                        value={inputValue}
                        onChangeText={setInputValue}
                        placeholder={placeholder}
                        placeholderTextColor={onSurfaceVariantColor}
                        keyboardType="numeric"
                    />

                    <View style={styles.modalButtons}>
                        <HapticPressable onPress={onClose} style={[styles.modalButton, styles.cancelButton]}>
                            <ThemedText>Cancel</ThemedText>
                        </HapticPressable>
                        <HapticPressable onPress={handleSave} style={[styles.modalButton, styles.saveButton, { backgroundColor: primaryColor }]}>
                            <ThemedText style={{ color: onPrimaryColor }}>Save</ThemedText>
                        </HapticPressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
});

const DateTimeModal = memo(function ({ visible, onClose, value, onSave, title, mode }: {
    visible: boolean;
    onClose: () => void;
    value: Date;
    onSave: (value: Date) => void;
    title: string;
    mode: SettingDateTimeMode;
}) {
    const [selectedDate, setSelectedDate] = useState(value);
    const surfaceColor = useThemeColor("surface");
    const primaryColor = useThemeColor("primary");
    const onPrimaryColor = useThemeColor("onPrimary");


    const handleSave = () => {
        onSave(selectedDate);
        onClose();
    };

    const adjustHour = (delta: number) => {
        const newDate = new Date(selectedDate);
        newDate.setHours(newDate.getHours() + delta);
        setSelectedDate(newDate);
    };

    const adjustMinute = (delta: number) => {
        const newDate = new Date(selectedDate);
        newDate.setMinutes(newDate.getMinutes() + delta);
        setSelectedDate(newDate);
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: surfaceColor }]}>
                    <View style={styles.modalHeader}>
                        <ThemedText type="subtitle">{title}</ThemedText>
                        <HapticPressable onPress={onClose} style={styles.modalCloseButton}>
                            <ThemedIcon iconSet="Ionicons" name="close" size={24} />
                        </HapticPressable>
                    </View>

                    {mode == SettingDateTimeMode.Time ? (
                        <View style={styles.timePicker}>
                            <View style={styles.timeColumn}>
                                <HapticPressable onPress={() => adjustHour(1)} style={styles.timeButton}>
                                    <ThemedIcon iconSet="Ionicons" name="chevron-up" size={24} />
                                </HapticPressable>
                                <ThemedText type="title">{selectedDate.getHours().toString().padStart(2, '0')}</ThemedText>
                                <HapticPressable onPress={() => adjustHour(-1)} style={styles.timeButton}>
                                    <ThemedIcon iconSet="Ionicons" name="chevron-down" size={24} />
                                </HapticPressable>
                            </View>
                            <ThemedText type="title">:</ThemedText>
                            <View style={styles.timeColumn}>
                                <HapticPressable onPress={() => adjustMinute(1)} style={styles.timeButton}>
                                    <ThemedIcon iconSet="Ionicons" name="chevron-up" size={24} />
                                </HapticPressable>
                                <ThemedText type="title">{selectedDate.getMinutes().toString().padStart(2, '0')}</ThemedText>
                                <HapticPressable onPress={() => adjustMinute(-1)} style={styles.timeButton}>
                                    <ThemedIcon iconSet="Ionicons" name="chevron-down" size={24} />
                                </HapticPressable>
                            </View>
                        </View>
                    ) : (
                        <View style={styles.dateDisplay}>
                            <ThemedText type="title">
                                {selectedDate.toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                })}
                            </ThemedText>
                        </View>
                    )}

                    <View style={styles.modalButtons}>
                        <HapticPressable onPress={onClose} style={[styles.modalButton, styles.cancelButton]}>
                            <ThemedText>Cancel</ThemedText>
                        </HapticPressable>
                        <HapticPressable onPress={handleSave} style={[styles.modalButton, styles.saveButton, { backgroundColor: primaryColor }]}>
                            <ThemedText style={{ color: onPrimaryColor }}>Save</ThemedText>
                        </HapticPressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
});

const ListManagerModal = memo(function ({ visible, onClose, items, onSave, title, placeholder, mode = SettingTextMode.Plain }: {
    visible: boolean;
    onClose: () => void;
    items: string[];
    onSave: (items: string[]) => void;
    title: string;
    placeholder?: string;
    mode?: SettingTextMode;
}) {
    const [listItems, setListItems] = useState([...items]);
    const [newItem, setNewItem] = useState('');
    const surfaceColor = useThemeColor("surface");
    const outlineColor = useThemeColor("outline");
    const surfaceContainerColor = useThemeColor("surfaceContainer");
    const primaryContainerColor = useThemeColor("primaryContainer");
    const primaryColor = useThemeColor("primary");
    const onPrimaryColor = useThemeColor("onPrimary");
    const onSurfaceColor = useThemeColor("onSurface");
    const onSurfaceVariantColor = useThemeColor("onSurfaceVariant");


    const handleSave = () => {
        onSave(listItems);
        onClose();
    };

    const addItem = () => {
        if (newItem.trim() && !listItems.includes(newItem.trim())) {
            setListItems([...listItems, newItem.trim()]);
            setNewItem('');
        }
    };

    const handlePickFile = async () => {
        try {
            const result = await fs.fsOpenDirectorySelector(undefined);
            setListItems([...listItems, result]);
            setNewItem('');
        } catch { }
    };

    const removeItem = (index: number) => {
        setListItems(listItems.filter((_, i) => i !== index));
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: surfaceColor, borderColor: outlineColor }]}>
                    <View style={styles.modalHeader}>
                        <ThemedText type="subtitle">{title}</ThemedText>
                        <HapticPressable onPress={onClose} style={styles.modalCloseButton}>
                            <ThemedIcon iconSet="Ionicons" name="close" size={24} />
                        </HapticPressable>
                    </View>

                    {/* Add new item input */}
                    {(mode == SettingTextMode.Plain || mode == SettingTextMode.Url) &&
                        <View style={styles.addItemContainer}>
                            <TextInput
                                style={[styles.textInput, { backgroundColor: surfaceContainerColor, borderColor: outlineColor, color: onSurfaceColor, flex: 1 }]}
                                value={newItem}
                                onChangeText={setNewItem}
                                placeholder={placeholder || "Add new item"}
                                placeholderTextColor={onSurfaceVariantColor}
                                onSubmitEditing={addItem}
                            />
                            <HapticPressable onPress={addItem} style={[styles.addButton, { backgroundColor: primaryColor }]}>
                                <ThemedIcon iconSet="Ionicons" name="add" size={20} color={{ light: 'white', dark: 'white' }} />
                            </HapticPressable>
                        </View>
                    }
                    {mode == SettingTextMode.Path &&
                        <View style={styles.addItemContainer}>
                            <HapticPressable onPress={handlePickFile} style={[styles.filePickerButton, { backgroundColor: primaryContainerColor }]}>
                                <ThemedIcon iconSet="Ionicons" name="folder-outline" size={20} />
                                <ThemedText style={styles.filePickerText}>Browse Files</ThemedText>
                            </HapticPressable>
                        </View>
                    }

                    {/* List items */}
                    <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
                        {listItems.map((item, index) => (
                            <View key={index} style={[styles.listItem, { backgroundColor: surfaceContainerColor, borderColor: outlineColor }]}>
                                <ThemedText style={styles.listItemText}>{item}</ThemedText>
                                <HapticPressable onPress={() => removeItem(index)} style={styles.removeButton}>
                                    <ThemedIcon iconSet="Ionicons" name="close-circle" size={24} color={{ light: '#ff4444', dark: '#ff6666' }} />
                                </HapticPressable>
                            </View>
                        ))}
                        {listItems.length === 0 && (
                            <View style={styles.emptyListContainer}>
                                <ThemedText color={{ light: '#666666', dark: '#999999' }}>No items added yet</ThemedText>
                            </View>
                        )}
                    </ScrollView>

                    <View style={styles.modalButtons}>
                        <HapticPressable onPress={onClose} style={[styles.modalButton, styles.cancelButton]}>
                            <ThemedText>Cancel</ThemedText>
                        </HapticPressable>
                        <HapticPressable onPress={handleSave} style={[styles.modalButton, styles.saveButton, { backgroundColor: primaryColor }]}>
                            <ThemedText style={{ color: onPrimaryColor }}>Save</ThemedText>
                        </HapticPressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
});

const SingleSelectionModal = memo(function ({ visible, onClose, options, selectedIndex, onSave, title }: {
    visible: boolean;
    onClose: () => void;
    options: string[];
    selectedIndex?: number;
    onSave: (index: number) => void;
    title: string;
}) {
    const [selected, setSelected] = useState(selectedIndex ?? -1);
    const surfaceColor = useThemeColor("surface");
    const outlineColor = useThemeColor("outline");
    const primaryContainerColor = useThemeColor("primaryContainer");
    const surfaceContainerColor = useThemeColor("surfaceContainer");
    const primaryColor = useThemeColor("primary");
    const onPrimaryColor = useThemeColor("onPrimary");


    const handleSave = () => {
        if (selected >= 0) {
            onSave(selected);
        }
        onClose();
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: surfaceColor, borderColor: outlineColor }]}>
                    <View style={styles.modalHeader}>
                        <ThemedText type="subtitle">{title}</ThemedText>
                        <HapticPressable onPress={onClose} style={styles.modalCloseButton}>
                            <ThemedIcon iconSet="Ionicons" name="close" size={24} />
                        </HapticPressable>
                    </View>

                    <ScrollView style={styles.selectionContainer} showsVerticalScrollIndicator={false}>
                        {options.map((option, index) => (
                            <HapticPressable
                                key={index}
                                onPress={() => setSelected(index)}
                                style={[
                                    styles.selectionItem,
                                    {
                                        backgroundColor: selected === index ? primaryContainerColor : surfaceContainerColor,
                                        borderColor: outlineColor
                                    }
                                ]}
                            >
                                <ThemedText style={styles.selectionItemText}>{option}</ThemedText>
                                {selected === index && (
                                    <ThemedIcon iconSet="Ionicons" name="checkmark" size={20} color={{ light: primaryColor, dark: primaryColor }} />
                                )}
                            </HapticPressable>
                        ))}
                    </ScrollView>

                    <View style={styles.modalButtons}>
                        <HapticPressable onPress={onClose} style={[styles.modalButton, styles.cancelButton]}>
                            <ThemedText>Cancel</ThemedText>
                        </HapticPressable>
                        <HapticPressable onPress={handleSave} style={[styles.modalButton, styles.saveButton, { backgroundColor: primaryColor }]}>
                            <ThemedText style={{ color: onPrimaryColor }}>Save</ThemedText>
                        </HapticPressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
});

const MultipleSelectionModal = memo(function ({ visible, onClose, options, selectedIndices, onSave, title }: {
    visible: boolean;
    onClose: () => void;
    options: string[];
    selectedIndices: number[];
    onSave: (indices: number[]) => void;
    title: string;
}) {
    const [selected, setSelected] = useState([...selectedIndices]);
    const surfaceColor = useThemeColor("surface");
    const outlineColor = useThemeColor("outline");
    const primaryContainerColor = useThemeColor("primaryContainer");
    const surfaceContainerColor = useThemeColor("surfaceContainer");
    const primaryColor = useThemeColor("primary");
    const onPrimaryColor = useThemeColor("onPrimary");

    const handleSave = () => {
        onSave(selected);
        onClose();
    };

    const toggleSelection = (index: number) => {
        if (selected.includes(index)) {
            setSelected(selected.filter(i => i !== index));
        } else {
            setSelected([...selected, index]);
        }
    };

    return (
        <Modal visible={visible} transparent animationType="fade">
            <View style={styles.modalOverlay}>
                <View style={[styles.modalContent, { backgroundColor: surfaceColor, borderColor: outlineColor }]}>
                    <View style={styles.modalHeader}>
                        <ThemedText type="subtitle">{title}</ThemedText>
                        <HapticPressable onPress={onClose} style={styles.modalCloseButton}>
                            <ThemedIcon iconSet="Ionicons" name="close" size={24} />
                        </HapticPressable>
                    </View>

                    <ScrollView style={styles.selectionContainer} showsVerticalScrollIndicator={false}>
                        {options.map((option, index) => (
                            <HapticPressable
                                key={index}
                                onPress={() => toggleSelection(index)}
                                style={[
                                    styles.selectionItem,
                                    {
                                        backgroundColor: selected.includes(index) ? primaryContainerColor : surfaceContainerColor,
                                        borderColor: outlineColor
                                    }
                                ]}
                            >
                                <ThemedText style={styles.selectionItemText}>{option}</ThemedText>
                                {selected.includes(index) && (
                                    <ThemedIcon iconSet="Ionicons" name="checkmark" size={20} color={{ light: primaryColor, dark: primaryColor }} />
                                )}
                            </HapticPressable>
                        ))}
                    </ScrollView>

                    <View style={styles.modalButtons}>
                        <HapticPressable onPress={onClose} style={[styles.modalButton, styles.cancelButton]}>
                            <ThemedText>Cancel</ThemedText>
                        </HapticPressable>
                        <HapticPressable onPress={handleSave} style={[styles.modalButton, styles.saveButton, { backgroundColor: primaryColor }]}>
                            <ThemedText style={{ color: onPrimaryColor }}>Save</ThemedText>
                        </HapticPressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
});

const SettingsItem = memo(function (props: SettingsItemProps & { isLast: boolean }) {
    const borderColor = useThemeColor("outline");
    const backgroundColor = useThemeColor("surface");
    const primaryColor = useThemeColor('primary');
    const [modalVisible, setModalVisible] = useState(false);

    const handlePress = () => {
        if ("chevron" in props && props.chevron == true) {
            if (props.onPress) {
                props.onPress();
            }
        } else {
            setModalVisible(true);
        }
    };

    const displayValue = (props: SettingsItemProps) => {
        if (props.type === SettingItemType.DateTime && "value" in props && props.value instanceof Date) {
            if (props.mode === SettingDateTimeMode.Time) return props.value.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            if (props.mode === SettingDateTimeMode.Date) return props.value.toLocaleDateString();
        }
        if (props.type === SettingItemType.List && "items" in props) {
            return `${props.items.length} items`;
        }
        if (props.type === SettingItemType.SingleSelection && "options" in props && "selectedIndex" in props && props.selectedIndex !== undefined) {
            return props.options[props.selectedIndex] || 'None selected';
        }
        if (props.type === SettingItemType.MultipleSelection && "options" in props && "selectedIndices" in props) {
            const count = props.selectedIndices.length;
            if (count === 0) return 'None selected';
            if (count === 1) return props.options[props.selectedIndices[0]];
            return `${count} selected`;
        }
        if ("value" in props && props.value !== undefined) {
            return props.value.toString();
        }
        return '';
    };

    return (
        <>
            <HapticPressable
                onPress={handlePress}
                style={[styles.settingsItem, { backgroundColor, borderBottomWidth: props.isLast ? undefined : StyleSheet.hairlineWidth, borderBottomColor: props.isLast ? undefined : borderColor }]}
            >
                <View style={styles.settingsItemContent}>
                    <View style={styles.settingsItemTextContainer}>
                        <ThemedText type='defaultSemiBold'>{props.title}</ThemedText>
                        {props.subtitle && (
                            <ThemedText style={styles.settingsItemSubtitle} color={{ light: '#666666', dark: '#999999' }}>
                                {props.subtitle}
                            </ThemedText>
                        )}
                    </View>
                    <View style={styles.settingsItemRight}>
                        {props.type == SettingItemType.Toggle && typeof props.value === 'boolean' && (
                            <Switch
                                value={props.value}
                                onValueChange={props.onToggle}
                                trackColor={{ false: '#767577', true: primaryColor }}
                                thumbColor={props.value ? '#ffffff' : '#f4f3f4'}
                            />
                        )}
                        {props.type != SettingItemType.Toggle && (
                            <ThemedText color={{ light: '#666666', dark: '#999999' }}>
                                {displayValue(props)}
                            </ThemedText>
                        )}
                        {("chevron" in props && props.chevron) && (
                            <ThemedIcon iconSet="Ionicons" name="chevron-forward" size={20} color={{ light: '#666666', dark: '#999999' }} />
                        )}
                    </View>
                </View>
            </HapticPressable>

            {props.type == SettingItemType.Text && (
                <TextInputModal
                    visible={modalVisible}
                    onClose={() => setModalVisible(false)}
                    value={props.value ?? ""}
                    onSave={(newValue) => { props.onTextChange(newValue); setModalVisible(false); }}
                    title={props.title}
                    placeholder={props.placeholder}
                    mode={props.mode}
                />
            )}

            {props.type == SettingItemType.Number && (
                <NumberInputModal
                    visible={modalVisible}
                    onClose={() => setModalVisible(false)}
                    value={props.value ?? 0}
                    onSave={(newValue) => { props.onNumberChange(newValue); setModalVisible(false); }}
                    title={props.title}
                    placeholder={props.placeholder}
                />
            )}

            {props.type == SettingItemType.DateTime && (
                <DateTimeModal
                    visible={modalVisible}
                    onClose={() => setModalVisible(false)}
                    value={props.value ?? new Date()}
                    onSave={(newValue) => { props.onDateChange(newValue); setModalVisible(false); }}
                    title={props.title}
                    mode={props.mode}
                />
            )}

            {props.type == SettingItemType.List && (
                <ListManagerModal
                    visible={modalVisible}
                    onClose={() => setModalVisible(false)}
                    items={props.items}
                    mode={props.mode}
                    onSave={(newItems) => {
                        // Update items by calling onAddItem/onRemoveItem appropriately
                        // For simplicity, we'll replace the entire list
                        const currentItems = props.items;
                        // Remove items that are not in newItems
                        currentItems.forEach((item, index) => {
                            if (!newItems.includes(item)) {
                                props.onRemoveItem(index);
                            }
                        });
                        // Add new items
                        newItems.forEach(item => {
                            if (!currentItems.includes(item)) {
                                props.onAddItem(item);
                            }
                        });
                        setModalVisible(false);
                    }}
                    title={props.title}
                    placeholder={props.placeholder}
                />
            )}

            {props.type == SettingItemType.SingleSelection && (
                <SingleSelectionModal
                    visible={modalVisible}
                    onClose={() => setModalVisible(false)}
                    options={props.options}
                    selectedIndex={props.selectedIndex}
                    onSave={(newIndex) => { props.onSelectionChange(newIndex); setModalVisible(false); }}
                    title={props.title}
                />
            )}

            {props.type == SettingItemType.MultipleSelection && (
                <MultipleSelectionModal
                    visible={modalVisible}
                    onClose={() => setModalVisible(false)}
                    options={props.options}
                    selectedIndices={props.selectedIndices}
                    onSave={(newIndices) => { props.onSelectionChange(newIndices); setModalVisible(false); }}
                    title={props.title}
                />
            )}
        </>
    );
});

type SettingsSection = {
    title: string;
    items: SettingsItemProps[];
};

type SettingsCategory = {
    title: string;
    icon: string;
    iconSet: 'Ionicons' | 'FontAwesome6' | 'MaterialIcons';
    sections: SettingsSection[];
};


// FIXME: fill with settings 
const settingsCategories: SettingsCategory[] = [
    {
        title: "General",
        icon: "settings-outline",
        iconSet: "Ionicons",
        sections: [
            {
                title: "System",
                items: [
                    {
                        type: SettingItemType.Text,
                        title: "Device Name",
                        value: "My Device",
                        placeholder: "Enter device name",
                        onTextChange: (value) => console.log("Device name:", value)
                    },
                    {
                        type: SettingItemType.DateTime,
                        mode: SettingDateTimeMode.Date,
                        title: "Date",
                        value: new Date(),
                        onDateChange: (value) => console.log("Date changed:", value)
                    },
                    {
                        type: SettingItemType.DateTime,
                        mode: SettingDateTimeMode.Time,
                        title: "Wake Up Time",
                        value: new Date(),
                        onDateChange: (value) => console.log("Wake time:", value)
                    },
                    {
                        type: SettingItemType.Number,
                        title: "Auto-Lock Timeout",
                        value: 300,
                        placeholder: "Seconds",
                        onNumberChange: (value) => console.log("Timeout:", value)
                    },
                ]
            },
            {
                title: "Accessibility",
                items: [
                    { type: SettingItemType.Toggle, title: "VoiceOver", value: false, onToggle: (value) => console.log("VoiceOver:", value) },
                    { type: SettingItemType.Toggle, title: "Zoom", value: false, onToggle: (value) => console.log("Zoom:", value) },
                    { type: SettingItemType.Toggle, title: "Button Shapes", value: true, onToggle: (value) => console.log("Button Shapes:", value) },
                ]
            }
        ]
    },
    {
        title: "Display & Brightness",
        icon: "sunny-outline",
        iconSet: "Ionicons",
        sections: [
            {
                title: "Appearance",
                items: [
                    {
                        type: SettingItemType.Toggle,
                        title: "Automatic",
                        subtitle: "Light and Dark",
                        value: true,
                        onToggle: (value) => console.log("Auto appearance:", value)
                    },
                    {
                        type: SettingItemType.Number,
                        title: "Brightness Level",
                        value: 75,
                        placeholder: "0-100",
                        onNumberChange: (value) => console.log("Brightness:", value)
                    },
                ]
            },
            {
                title: "Text Size",
                items: [
                    { type: SettingItemType.Category, title: "Text Size", chevron: true, onPress: () => Alert.alert("Text Size", "Opens text size settings") },
                    { type: SettingItemType.Toggle, title: "Bold Text", value: false, onToggle: (value) => console.log("Bold Text:", value) },
                ]
            }
        ]
    },
    {
        title: "Lists & Selection",
        icon: "list-outline",
        iconSet: "Ionicons",
        sections: [
            {
                title: "Manage Lists",
                items: [
                    {
                        type: SettingItemType.List,
                        title: "Favorite Apps",
                        subtitle: "Manage your favorite applications",
                        items: ["Safari", "Mail", "Photos", "Messages"],
                        onAddItem: (item) => console.log("Add app:", item),
                        onRemoveItem: (index) => console.log("Remove app at index:", index),
                        placeholder: "Enter app name"
                    },
                    {
                        type: SettingItemType.List,
                        title: "Blocked Keywords",
                        items: ["spam", "advertisement"],
                        onAddItem: (item) => console.log("Add keyword:", item),
                        onRemoveItem: (index) => console.log("Remove keyword at index:", index),
                        placeholder: "Enter keyword to block"
                    },
                    {
                        type: SettingItemType.List,
                        title: "Email Addresses",
                        items: [],
                        onAddItem: (item) => console.log("Add email:", item),
                        onRemoveItem: (index) => console.log("Remove email at index:", index),
                        placeholder: "Enter email address"
                    },
                ]
            },
            {
                title: "Selection Options",
                items: [
                    {
                        type: SettingItemType.SingleSelection,
                        title: "Default Browser",
                        options: ["Safari", "Chrome", "Firefox", "Edge"],
                        selectedIndex: 0,
                        onSelectionChange: (index) => console.log("Selected browser:", index)
                    },
                    {
                        type: SettingItemType.SingleSelection,
                        title: "Theme",
                        options: ["System", "Light", "Dark", "Auto"],
                        selectedIndex: 0,
                        onSelectionChange: (index) => console.log("Selected theme:", index)
                    },
                    {
                        type: SettingItemType.MultipleSelection,
                        title: "Notification Types",
                        subtitle: "Choose which notifications to receive",
                        options: ["Email", "SMS", "Push Notifications", "In-App", "Desktop"],
                        selectedIndices: [0, 2],
                        onSelectionChange: (indices) => console.log("Selected notifications:", indices)
                    },
                    {
                        type: SettingItemType.MultipleSelection,
                        title: "Export Formats",
                        options: ["PDF", "HTML", "CSV", "JSON", "XML"],
                        selectedIndices: [0, 1, 2],
                        onSelectionChange: (indices) => console.log("Selected formats:", indices)
                    },
                ]
            }
        ]
    },
    {
        title: "Network & Storage",
        icon: "wifi-outline",
        iconSet: "Ionicons",
        sections: [
            {
                title: "Network",
                items: [
                    {
                        type: SettingItemType.Text,
                        mode: SettingTextMode.Url,
                        title: "Server URL",
                        value: "https://example.com/api",
                        placeholder: "Enter server URL",
                        onTextChange: (value) => console.log("Server URL:", value)
                    },
                    {
                        type: SettingItemType.Text,
                        mode: SettingTextMode.Path,
                        title: "Backup Path",
                        value: "/Users/Documents/Backup",
                        placeholder: "Select backup location",
                        onTextChange: (value) => console.log("Backup path:", value)
                    },
                    {
                        type: SettingItemType.Toggle,
                        title: "Auto Sync",
                        value: true,
                        onToggle: (value) => console.log("Auto Sync:", value)
                    },
                ]
            },
            {
                title: "Storage",
                items: [
                    {
                        type: SettingItemType.Number,
                        title: "Cache Size Limit",
                        value: 1024,
                        placeholder: "MB",
                        onNumberChange: (value) => console.log("Cache limit:", value)
                    },
                    { type: SettingItemType.Category, title: "Clear Cache", chevron: true, onPress: () => Alert.alert("Clear Cache", "Cache cleared successfully") },
                ]
            }
        ]
    },
    {
        title: "Privacy & Security",
        icon: "shield-checkmark-outline",
        iconSet: "Ionicons",
        sections: [
            {
                title: "Privacy",
                items: [
                    { type: SettingItemType.Toggle, title: "Location Services", value: true, chevron: true, onPress: () => Alert.alert("Location Services", "Opens location settings"), onToggle: () => { } },
                    { type: SettingItemType.Category, title: "Analytics & Improvements", chevron: true, onPress: () => Alert.alert("Analytics", "Opens analytics settings") },
                    {
                        type: SettingItemType.Text,
                        title: "Data Export Email",
                        value: "user@example.com",
                        placeholder: "Enter email address",
                        onTextChange: (value) => console.log("Export email:", value)
                    },
                ]
            },
            {
                title: "Security",
                items: [
                    { type: SettingItemType.Toggle, title: "Biometric Lock", value: true, onToggle: (value) => console.log("Biometric:", value) },
                    {
                        type: SettingItemType.Number,
                        title: "Session Timeout",
                        value: 15,
                        placeholder: "Minutes",
                        onNumberChange: (value) => console.log("Session timeout:", value)
                    },
                    { type: SettingItemType.Category, title: "Emergency SOS", chevron: true, onPress: () => Alert.alert("Emergency SOS", "Opens emergency settings") },
                ]
            }
        ]
    }
];

const SettingsContent = memo(function ({ category }: { category: SettingsCategory }) {
    return (
        <ScrollView style={styles.settingsContent} showsVerticalScrollIndicator={false}>
            {category.sections.map((section, sectionIndex) => (
                <View key={category.title + sectionIndex} style={styles.settingsSection}>
                    <ThemedText type='subtitle' style={styles.sectionTitle}>
                        {section.title}
                    </ThemedText>
                    <View style={styles.sectionContent}>
                        {section.items.map((item, itemIndex) => (
                            <SettingsItem key={itemIndex} {...item} isLast={itemIndex == section.items.length - 1} />
                        ))}
                    </View>
                </View>
            ))}
        </ScrollView>
    );
});

type Props = {
    category?: string;
};

const CATEGORIES_MIN_WIDTH = 300;
const CATEGORIES_SHORT_MAX_WIDTH = 800;
const CATEGORIES_LONG_MAX_WIDTH = 340;
const CATEGORIES_THRESHOLD = 600;
const CONTENT_MAX_WIDTH = 800;

const styles = StyleSheet.create({
    rootContainer: {
        height: "100%",
        width: "100%"
    },
    headerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    contentHeaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(0,0,0,0.1)',
        paddingVertical: 20,
    },
    backButton: {
        marginHorizontal: 20,
        alignSelf: 'flex-start',
        zIndex: 1,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        position: 'absolute',
        width: "100%",
        textAlign: 'center',
        zIndex: 0,
    },
    headerSpacer: {
    },
    categoriesContainer: {
        flex: 1,
        flexDirection: 'column',
        minHeight: 70,
        minWidth: CATEGORIES_MIN_WIDTH,
        paddingTop: 20,
        paddingBottom: 20,
        zIndex: 1,
    },
    splitViewContainer: {
        flex: 1,
        flexDirection: 'row',
    },
    menuContainer: {
        flexDirection: 'row',
        minHeight: 70,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 20,
    },
    settingsTabsContainer: {
        flex: 1,
    },
    settingsTabContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 15,
        marginVertical: 4,
        borderRadius: 12,
    },
    settingsTabText: {
        marginLeft: 12,
        fontSize: 18,
    },
    contentContainer: {
        flex: 1,
        flexDirection: 'column',
        flexGrow: 2
    },
    contentSelector: {
        flex: 1,
        paddingTop: 20,
    },
    settingsContent: {
        flex: 1,
        paddingHorizontal: 20,
        width: "100%",
    },
    settingsSection: {
        alignItems: 'center',
        marginBottom: 40,
    },
    sectionTitle: {
        width: "100%",
        maxWidth: CONTENT_MAX_WIDTH,
        marginBottom: 12,
        paddingHorizontal: 16,
        fontSize: 20,
        fontWeight: '600',
    },
    sectionContent: {
        width: "100%",
        maxWidth: CONTENT_MAX_WIDTH,
        borderRadius: 12,
        overflow: 'hidden',
    },
    settingsItem: {
        paddingHorizontal: 16,
        paddingVertical: 12
    },
    settingsItemContent: {
        flexDirection: 'row',
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: 44,
    },
    settingsItemTextContainer: {
        flex: 1,
        marginRight: 16,
    },
    settingsItemSubtitle: {
        fontSize: 14,
        marginTop: 2,
    },
    settingsItemRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    // Modal styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        borderWidth: StyleSheet.hairlineWidth,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalCloseButton: {
        padding: 4,
    },
    textInput: {
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 12,
        fontSize: 16,
        minHeight: 44,
    },
    filePickerButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginBottom: 16,
        gap: 8,
    },
    filePickerText: {
        fontSize: 16,
        fontWeight: '500',
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    modalButton: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
    },
    cancelButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#ccc',
    },
    saveButton: {
        // backgroundColor set dynamically
    },
    // Date/Time picker styles
    timePicker: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 20,
        gap: 20,
    },
    timeColumn: {
        alignItems: 'center',
        gap: 10,
    },
    timeButton: {
        padding: 8,
        borderRadius: 8,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    dateDisplay: {
        alignItems: 'center',
        marginVertical: 20,
    },
    // List Manager styles
    addItemContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },
    addButton: {
        width: 44,
        height: 44,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listContainer: {
        maxHeight: 300,
        marginBottom: 16,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginVertical: 2,
        borderRadius: 8,
        borderWidth: StyleSheet.hairlineWidth,
    },
    listItemText: {
        flex: 1,
        fontSize: 16,
    },
    removeButton: {
        padding: 4,
    },
    emptyListContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    // Selection styles
    selectionContainer: {
        maxHeight: 400,
        marginBottom: 16,
    },
    selectionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        marginVertical: 2,
        borderRadius: 8,
        borderWidth: StyleSheet.hairlineWidth,
    },
    selectionItemText: {
        flex: 1,
        fontSize: 16,
    },
});

function makeSettingsItemProp(value: any, schema: Schema, name: string, path: string) {
    switch (schema.type) {
        case 'boolean': {
            const result: SettingsItemProps = {
                type: SettingItemType.Toggle,
                title: schema.label || name,
                value,
                onToggle: (value) => {
                    core.settingsSet({
                        path,
                        value
                    })
                }
            };

            return result;
        }

        case 'string': {
            const result: SettingsItemProps = {
                type: SettingItemType.Text,
                title: schema.label || name,
                value,
                onTextChange: (value) => {
                    core.settingsSet({
                        path,
                        value
                    })
                }
            };

            return result;
        }

        case 'number': {
            const result: SettingsItemProps = {
                type: SettingItemType.Number,
                title: schema.label || name,
                value,
                onNumberChange: (value) => {
                    core.settingsSet({
                        path,
                        value
                    })
                }
            };

            return result;
        }

        case 'path': {
            const result: SettingsItemProps = {
                type: SettingItemType.Text,
                mode: SettingTextMode.Path,
                title: schema.label || name,
                value,
                onTextChange: (value) => {
                    core.settingsSet({
                        path,
                        value
                    })
                }
            };

            return result;
        }

        case 'variant': {
            const result: SettingsItemProps = {
                type: SettingItemType.SingleSelection,
                title: schema.label || name,
                options: schema.choices,
                selectedIndex: schema.choices.findIndex(value),
                onSelectionChange: (selection) => {
                    core.settingsSet({
                        path,
                        value: schema.choices[selection]
                    });
                }
            };

            return result;
        }

        case 'array': {
            const items = [...value];
            const result: SettingsItemProps = {
                type: SettingItemType.List,
                title: schema.label || name,
                items,
                mode: schema.items.type == "path" ? SettingTextMode.Path : SettingTextMode.Plain,
                onAddItem: (item) => {
                    items.push(item);
                    core.settingsSet({
                        path,
                        value: items
                    });
                },
                onRemoveItem: (index) => {
                    items.splice(index, 1);
                    core.settingsSet({
                        path,
                        value: items
                    });
                },
            };

            return result;
        }

        case 'object': {
            const result: SettingsItemProps = {
                type: SettingItemType.Category,
                title: schema.label || name,
            };

            return result;
        }
    }

    throw createError(ErrorCode.InternalError, `Unimplemented settings type ${(schema as any).type}`);
}

function makeSettingsSections(value: any, schema: SchemaObject, name: string, path: string) {
    const result: SettingsSection = {
        title: name,
        items: Object.keys(schema.properties).map(propertyName => {
            return makeSettingsItemProp(value[propertyName], schema.properties[propertyName], propertyName, path + "/" + propertyName)
        })
    };

    return [result];
}
function makeRootSettingsObject(value: object, schema: SchemaObject, path = "") {
    const result: SettingsCategory[] = [];

    Object.keys(schema.properties).forEach(propertyName => {
        const property = schema.properties[propertyName];

        const sections = makeSettingsSections(
            (value as any)[propertyName], property as SchemaObject,
            property.label ?? propertyName, path + "/" + propertyName);

        const category: SettingsCategory = {
            icon: "settings-outline",
            iconSet: "Ionicons",
            title: property.label ?? propertyName,
            sections
        };

        result.push(category);
    });


    return result;
}


export function Settings(_props?: Props) {
    const dimension = useWindowDimensions();
    const currentShortView = dimension.width <= CATEGORIES_THRESHOLD;
    const [shortView, setShortView] = useState(currentShortView);
    const [activeTab, setActiveTab] = useState(shortView ? -1 : -1);
    const [lastActiveTab, setLastActiveTab] = useState(0);
    const backgroundColor = useThemeColor("background");
    const surfaceContainerColor = useThemeColor("surfaceContainer");
    const secondaryContainerColor = useThemeColor("surfaceContainerHigh");
    const [showContentView, setContentView] = useState(false);
    const [categories, setCategories] = useState(settingsCategories);
    const [updateIndex, setUpdateIndex] = useState(0);
    const insets = useSafeAreaInsets();


    // Mock navigation function for back button
    const goBack = () => {
        core.popView();
    };

    const onTabSelect = (index: number) => {
        setContentView(true);
        setActiveTab(index);
    }

    const onContentBack = () => {
        setLastActiveTab(activeTab);
        setActiveTab(-1);
        setContentView(false);
    };

    const showContent = (activeTab >= 0 || lastActiveTab >= 0) && (!shortView || showContentView) && activeTab >= 0;
    const showCategories = (activeTab >= 0 || lastActiveTab >= 0) && (!showContentView || !shortView);

    useEffect(() => {
        (async () => {
            try {
                const { value, schema } = await core.settingsGet({ path: "" });

                const categories = makeRootSettingsObject(value as object, schema as SchemaObject);

                setCategories(categories);
                setUpdateIndex(updateIndex + 1);
            } catch (e) {
                console.error(`failed to fetch settings`, e);
            }
        })();
    }, []);

    useEffect(() => {
        if (currentShortView != shortView) {
            if (!shortView) {
                setContentView(true);
            }
            setShortView(currentShortView);
        }

        if ((!shortView || !currentShortView) && activeTab < 0) {
            setActiveTab(0);
        }

        const backAction = () => {
            if (shortView && showContent) {
                onContentBack();
            } else {
                goBack();
            }

            return true;
        };

        const backHandler = BackHandler.addEventListener(
            'hardwareBackPress',
            backAction
        );

        return () => backHandler.remove();
    });

    const safeArea = StyleSheet.create({
        categories: {
            paddingLeft: insets.left,
            paddingTop: insets.top + styles.categoriesContainer.paddingTop,
            paddingBottom: insets.bottom + styles.categoriesContainer.paddingBottom,
        },
        content: {
            paddingRight: insets.right,
            paddingTop: insets.top,
            paddingBottom: insets.bottom,
        }
    });

    const categoriesView = (
        <View style={[styles.categoriesContainer, safeArea.categories, { backgroundColor: surfaceContainerColor, maxWidth: shortView ? CATEGORIES_SHORT_MAX_WIDTH : CATEGORIES_LONG_MAX_WIDTH }]}>
            <View style={[styles.headerContainer]}>
                <HapticPressable onPress={goBack} style={styles.backButton}>
                    <ThemedIcon iconSet="Ionicons" name="chevron-back" size={28} />
                </HapticPressable>
                <ThemedText type="title" style={styles.headerTitle}>Settings</ThemedText>
                <View style={styles.headerSpacer} />
            </View>

            <View style={styles.menuContainer}>
                <View style={styles.settingsTabsContainer}>
                    <ScrollView showsVerticalScrollIndicator={false}>
                        {categories.map((category, index) => (
                            <SettingsTab
                                key={updateIndex + category.title}
                                title={category.title}
                                iconName={category.icon}
                                iconSet={category.iconSet}
                                active={activeTab === index}
                                onPress={() => onTabSelect(index)}
                            />
                        ))}
                    </ScrollView>
                </View>
            </View>
        </View>
    );

    const contentView = (
        <View key={updateIndex} style={[styles.contentContainer, safeArea.content, { backgroundColor: shortView ? surfaceContainerColor : secondaryContainerColor }]}>
            <UpDownViewSelector
                list={categories}
                style={[styles.contentSelector, { backgroundColor: secondaryContainerColor }]}
                renderItem={(category) => <SettingsContent category={category} />}
                selectedItem={activeTab < 0 ? lastActiveTab : activeTab}
            />
        </View>
    )

    const shortContentView = (
        <View key={updateIndex} style={[styles.contentContainer, safeArea.content, { backgroundColor: shortView ? surfaceContainerColor : secondaryContainerColor }]}>
            <View style={[styles.contentHeaderContainer, { backgroundColor: surfaceContainerColor }]}>
                <HapticPressable onPress={onContentBack} style={styles.backButton}>
                    <ThemedIcon iconSet="Ionicons" name="chevron-back" size={28} />
                </HapticPressable>
                <ThemedText type="title" style={styles.headerTitle}>{categories[activeTab < 0 ? lastActiveTab : activeTab].title}</ThemedText>
                <View style={styles.headerSpacer} />
            </View>

            <SettingsContent key={updateIndex} category={categories[activeTab < 0 ? lastActiveTab : activeTab]} />
        </View>
    )

    return (
        <View style={[styles.rootContainer, { backgroundColor }]}>
            {!shortView && <View style={[styles.splitViewContainer]}>
                {showCategories && categoriesView}
                {showContent && contentView}
            </View>
            }
            {shortView &&
                <LeftRightViewSelector key={updateIndex} style={[styles.splitViewContainer]}
                    list={[categoriesView, shortContentView]} renderItem={x => x} selectedItem={showCategories ? 0 : 1}
                />
            }
        </View>
    );
}
