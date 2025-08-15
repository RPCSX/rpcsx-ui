type IconResolution = 'normal' | 'high';

type LocalizedString = {
    text: string;
    lang?: string;
}

type LocalizedIcon = {
    uri: string;
    lang?: string;
    resolution?: IconResolution;
}

type ExplorerItemBase = {
    type: string;
    name: LocalizedString[] | string;
    icon?: LocalizedIcon[] | string;
    publisher?: string;
    version?: string;
    size?: number;
    actions?: Record<string, any>;
    progress?: string;
}

type ExecutableExplorerItem = {
    launcher: LauncherInfo;
}

type ExplorerItemGame = ExplorerItemBase & ExecutableExplorerItem & {
    type: 'game';
    titleId?: string;
    contentId?: string;
}

type ExplorerItemPackage = ExplorerItemBase & ExecutableExplorerItem & {
    type: 'package';
    titleId?: string;
    contentId?: string;
}

type ExplorerItemExtension = ExplorerItemBase & {
    type: 'extension';
}

type ExplorerItem = ExplorerItemGame | ExplorerItemPackage | ExplorerItemExtension;
