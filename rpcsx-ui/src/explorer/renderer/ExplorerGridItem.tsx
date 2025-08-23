import { ExplorerItem, getIcon, getName } from "./types";

interface ExplorerGridItemProps {
    item: ExplorerItem;
    onContextMenu?: () => void;
}

export default function ExplorerGridItem({ item, onContextMenu }: ExplorerGridItemProps) {
    return (
        <div 
            className="flex flex-col text-center items-center p-3 gap-3 text-sm rounded bg-neutral-700 hover:bg-neutral-600 active:ring-1 shadow-sm"
            onContextMenu={(e) => {
                if (onContextMenu) {
                    e.preventDefault();
                    onContextMenu();
                }
            }}
        >
            <img
                className="h-[8rem] w-[8rem]"
                src={getIcon(item) || '/default-icon.png'}
                alt={`${getName(item)} Icon`}
                loading="lazy"
            />
            <div className="flex flex-col justify-center items-center w-[8rem] h-[4rem]">
                <h1 className="overflow-hidden line-clamp-2">{getName(item)}</h1>
                <h3 className="overflow-hidden line-clamp-2">{item.titleId ? item.titleId : ""}</h3>
            </div>
        </div>
    );
}
