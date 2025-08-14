
export enum KeyboardModifiers {
    None = 0,
    Alt = 1 << 0,
    Ctrl = 1 << 1,
    Shift = 1 << 3,
};

export function getKeyModifiers(event: KeyboardEvent) {
    let result = KeyboardModifiers.None;
    if (event.altKey) {
        result |= KeyboardModifiers.Alt;
    }
    if (event.ctrlKey) {
        result |= KeyboardModifiers.Ctrl;
    }
    if (event.shiftKey) {
        result |= KeyboardModifiers.Shift;
    }
    return result;
}

export function parseKeySequence(sequence: string) {
    let modifiers = KeyboardModifiers.None;
    const elements = sequence.split('+');
    if (elements.length === 0) {
        throw new Error("invalid key sequence");
    }
    const key = elements.pop()!.toLowerCase();

    elements.forEach(e => {
        switch (e.trim().toLowerCase()) {
            case 'ctrl':
            case 'control': modifiers |= KeyboardModifiers.Ctrl; break;
            case 'shift': modifiers |= KeyboardModifiers.Shift; break;
            case 'alt': modifiers |= KeyboardModifiers.Alt; break;
            default:
                throw new Error("invalid key modifier");
        }
    });

    return { key, modifiers };
}
