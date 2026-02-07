// src/components/FeatureCard.tsx
import React from "react";
import clsx from "clsx";
import { Plus } from "lucide-react"

type FeatureCardProps = {
    backgroundColor?: string;
    title: string;
    subtitle: string;
    imageSrc?: string;
    children?: React.ReactNode;
    textColor?: string;
    border?: boolean;
};

export const FeatureCard: React.FC<FeatureCardProps> = ({
    backgroundColor = "bg-white",
    title,
    subtitle,
    imageSrc,
    children,
    textColor = "text-black",
    border = false,
}) => {
    return (
        <div
            className={clsx(
                "rounded-[30px] overflow-hidden relative flex flex-col justify-between p-6 min-h-[450px] transition-all shadow-md",
                backgroundColor,
                textColor,
                border && "border border-gray-200"
            )}
        >
            <div className="z-10 space-y-2">
                <p className="font-semibold text-sm opacity-80">{title}</p>
                <h2 className="text-2xl font-bold">{subtitle}</h2>
            </div>

            {imageSrc && (
                <img
                    src={imageSrc}
                    alt="Feature Visual"
                    className="absolute bottom-0 right-0 w-2/3 object-contain pointer-events-none opacity-90"
                />
            )}

            {children && <div className="z-10 mt-4">{children}</div>}

            {/* Optional + Icon */}
            <div>
                <div className="absolute bottom-4 right-4 text-3xl text-white z-20 rounded-full bg-purple-700 aspect-square p-3">
                    <Plus strokeWidth={3} />
                </div>
            </div>
        </div>
    );
};
