import { ReactNode } from "react";
// Import i18n initialization
import "../../i18n";

type LayoutProps = {
    children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
    return (
        <main className="flex flex-col h-full max-h-full" id="content">
            {children}
        </main>
    );
}
