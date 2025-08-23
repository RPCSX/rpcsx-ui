interface ToggleProps {
    value: boolean;
    label: string;
    onChange: (value: boolean) => void;
}

export default function Toggle({ value, label, onChange }: ToggleProps) {
    return (
        <label className="inline-flex items-center cursor-pointer">
            <input
                type="checkbox"
                checked={value}
                className="sr-only peer"
                onChange={(e) => onChange(e.target.checked)}
            />
            <div
                className="relative w-11 h-6 bg-neutral-700 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all border-gray-600 peer-checked:bg-blue-600"
            ></div>
            <span className="ms-3 text-sm font-medium text-gray-300">{label}</span>
        </label>
    );
}
