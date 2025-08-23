import { ExplorerItem, getIcon, getName, getRegion, FileHelper } from "./types";

interface ExplorerListItemProps {
    item: ExplorerItem;
    onContextMenu?: () => void;
}

export default function ExplorerListItem({ item, onContextMenu }: ExplorerListItemProps) {
    return (
        <div 
            className="flex flex-row p-3 gap-3 text-sm rounded bg-neutral-700 hover:bg-neutral-600 shadow-sm"
            onContextMenu={(e) => {
                if (onContextMenu) {
                    e.preventDefault();
                    onContextMenu();
                }
            }}
        >
            <img
                className="h-20 w-20"
                src={getIcon(item) || '/default-icon.png'}
                alt={`${getName(item)} Icon`}
                loading="lazy"
            />
            <div className="flex flex-col text-left">
                <h1 className="font-bold">{getName(item)}</h1>
                <p>{item.publisher}</p>
                <p>{item.version}</p>
                <p></p>
            </div>

            <div className="flex-grow"></div>

            <div className="flex flex-col text-right">
                <p>{'titleId' in item ? item.titleId : ''}</p>
                <p>{item.size ? FileHelper.humanFileSize(item.size, true) : ''}</p>
                <p>{item.contentId ? getRegion(item.contentId) : ''}</p>
                <p>{item.contentId ? item.contentId : ''}</p>
            </div>
        </div>
    );
}
