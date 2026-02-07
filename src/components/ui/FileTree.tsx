import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import React from "react";

type TreeNodeData = {
    name: string;
    path: string;
    disabled?: boolean;
    children?: TreeNodeData[];
};

interface TreeNodeProps {
    node: TreeNodeData;
    basePath?: string;
    level?: number;
}

const TreeNode: React.FC<TreeNodeProps> = ({ node, basePath = "", level = 0 }) => {
    const location = useLocation();
    const hasChildren = !!node.children?.length;


    const isRegex = node.path.startsWith("^");
    const fullPath = isRegex
        ? node.path
        : `${basePath}/${node.path}`.replace(/\/+/g, "/");

    let isActive = false;

    if (isRegex) {
        try {
            isActive = new RegExp(node.path).test(location.pathname);
        } catch (e) {
            console.error("Invalid regex in path:", node.path);
        }
    } else {
        isActive = location.pathname === fullPath;
    }

    const isDescendantActive =
        !isActive && !isRegex && location.pathname.startsWith(fullPath + "/");

    const shouldBeOpen = isActive || isDescendantActive;

    const [open, setOpen] = useState(shouldBeOpen);

    useEffect(() => {
        if (shouldBeOpen) {
            setOpen(true);
        }
    }, [shouldBeOpen]);

    const backgroundClass = shouldBeOpen ? "bg-gray-100" : "";

    return (
        <div className={`pl-${level * 4}`}>
            <div
                className={`flex items-center gap-1 cursor-pointer p-1 rounded ${backgroundClass}`}
                onClick={() => hasChildren && setOpen(!open)}
            >
                <span className={`${isActive ? "bg-gray-300" : "hover:bg-gray-200"} flex items-center gap-1 p-1 px-3 rounded`}>
                    {!node.disabled && <Link
                        to={fullPath}
                    >
                        {node.name}
                    </Link>}
                    {node.disabled && <>{node.name}</>}
                </span>
            </div>

            {open && hasChildren && (
                <div className={`pl-${level + 1} border-l border-gray-200`}>
                    {node.children!.map((child, idx) => (
                        <TreeNode node={child} key={idx} basePath={fullPath} level={level + 1} />
                    ))}
                </div>
            )}
        </div>
    );
};

interface FileTreeProps {
    data: TreeNodeData[];
    basePath?: string;
}

export const FileTree: React.FC<FileTreeProps> = ({ data, basePath = "" }) => {
    return (
        <div>
            {data.map((node, idx) => (
                <TreeNode node={node} key={idx} basePath={basePath} />
            ))}
        </div>
    );
};
