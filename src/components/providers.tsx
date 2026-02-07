import { App } from "framework7-react";

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <>{children}</>
        // <App theme="auto">
        //     {children}  
        // </App>
    )
}