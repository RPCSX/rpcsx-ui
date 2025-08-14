import { LauncherInfo } from "$core/types";

export type IconResolution = 'normal' | 'high';

export type LocalizedString = {
    text: string;
    lang?: string;
}

export type LocalizedIcon = {
    uri: string;
    lang?: string;
    resolution?: IconResolution;
}

export type ExplorerItemBase = {
    type: string;
    name: LocalizedString[] | string;
    icon?: LocalizedIcon[] | string;
    publisher?: string;
    version?: string;
    size?: number;
    actions?: Record<string, any>;
    progress?: string;
}

export type ExecutableExplorerItem = {
    launcher: LauncherInfo;
}

export type ExplorerItemGame = ExplorerItemBase & ExecutableExplorerItem & {
    type: 'game';
    titleId?: string;
    contentId?: string;
}

export type ExplorerItemPackage = ExplorerItemBase & ExecutableExplorerItem & {
    type: 'package';
    titleId?: string;
    contentId?: string;
}

export type ExplorerItemExtension = ExplorerItemBase & {
    type: 'extension';
}

export type ExplorerItem = ExplorerItemGame | ExplorerItemPackage | ExplorerItemExtension;
