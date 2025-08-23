import { forwardRef, useImperativeHandle, useRef, useState } from "react";

interface MenuItem {
    label: string;
    icon?: string;
    onClick?: () => void;
}

export interface MenuRef {
    show: (title: string, items: MenuItem[]) => void;
    hide: () => void;
}

const Menu = forwardRef<MenuRef>((_, ref) => {
    const menuElementRef = useRef<HTMLDivElement>(null);
    const contentElementRef = useRef<HTMLDivElement>(null);
    const [items, setItems] = useState<MenuItem[]>([]);
    const [title, setTitle] = useState("");

    const show = (showTitle: string, showItems: MenuItem[]) => {
        setItems(showItems);
        setTitle(showTitle);

        if (menuElementRef.current && contentElementRef.current) {
            menuElementRef.current.classList.remove("modal-hide");
            contentElementRef.current.classList.remove("modal-content-hide");
            menuElementRef.current.style.display = "block";
        }
    };

    const hide = () => {
        if (menuElementRef.current && contentElementRef.current) {
            menuElementRef.current.classList.add("modal-hide");
            contentElementRef.current.classList.add("modal-content-hide");
            menuElementRef.current.style.display = "none";
        }
    };

    useImperativeHandle(ref, () => ({
        show,
        hide
    }));

    return (
        <div className="modal" ref={menuElementRef}>
            <div className="modal-bg" onClick={hide}></div>
            <div
                className="modal-content bg-neutral-900 flex h-full p-2 space-x-2"
                ref={contentElementRef}
                onClick={(e) => e.stopPropagation()}
            >
                <ul className="flex-col space-y-2 w-full">
                    <li className="w-full">
                        {title}
                    </li>

                    {items.map((item, index) => (
                        <li key={index} className="w-full">
                            <button
                                onClick={() => {
                                    hide();
                                    if (item.onClick) {
                                        item.onClick();
                                    }
                                }}
                                className="hover:bg-neutral-600 inline-flex items-center p-2 pe-10 w-full rounded active:bg-neutral-800/40 shadow-sm"
                            >
                                {item.icon && (
                                    <img
                                        className="w-5 h-5 me-2 text-white"
                                        src={item.icon}
                                        alt={`${item.label} Icon`}
                                    />
                                )}
                                {item.label}
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
});

Menu.displayName = "Menu";

export default Menu;
