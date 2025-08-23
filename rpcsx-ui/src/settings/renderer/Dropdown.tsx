import { useState } from "react";
import { ChevronDownIcon } from "@heroicons/react/24/solid";

type DropdownProps = {
    values: string[];
    selectedValue: string;
    onSelectedValueChange: (value: string) => void;
    label: string;
}

export default function Dropdown({ values, selectedValue, onSelectedValueChange, label }: DropdownProps) {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);

    const toggleDropdown = () => {
        setIsDropdownOpen(!isDropdownOpen);
    };

    const changeSelectedValue = (value: string) => {
        onSelectedValueChange(value);
        toggleDropdown();
    };

    return (
        <div className="flex flex-row gap-5 items-center">
            <div className="w-56">
                <p>{label}</p>
            </div>
            <div>
                <button
                    onClick={toggleDropdown}
                    type="button"
                    className="inline-flex gap-2 items-center rounded border border-neutral-600 bg-neutral-700 text-white px-2 py-1 hover:bg-neutral-600 active:bg-neutral-700 shadow-sm"
                >
                    {selectedValue}
                    <div className="flex-grow"></div>
                    <div className="w-5 h-5">
                        <ChevronDownIcon className="w-full h-full" />
                    </div>
                </button>

                <div
                    className={`${
                        isDropdownOpen ? "" : "hidden"
                    } absolute mt-1 z-10 rounded border border-neutral-600 bg-neutral-700 text-white p-1 shadow-sm`}
                >
                    <ul className="inline-flex flex-col gap-1 w-full">
                        {values.map((value, index) => (
                            <button
                                key={index}
                                className={`${
                                    selectedValue === value
                                        ? "bg-blue-600"
                                        : "hover:bg-neutral-600"
                                } rounded px-2 py-1 text-left`}
                                onClick={() => changeSelectedValue(value)}
                            >
                                <li>{value}</li>
                            </button>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}
