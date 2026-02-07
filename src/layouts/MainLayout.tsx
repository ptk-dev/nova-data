import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import React from "react"
import { useAppContext } from '../context/AppContext';
import { cx } from '../components/ui/BarList';
import { FileTree } from '../components/ui/FileTree';

const fileData = [
  {
    name: "Dashboard",
    path: "/"
  },
  {
    name: "Analytics",
    path: "/analytics"
  },
  {
    name: "Sources",
    path: "/sources",
    children: [
      {
        name: "Source",
        path: "^/sources/(.*)?$",
        disabled: true,
      }
    ]
  }
];

export default function MainLayout({ children }: { children: ReactNode }) {
  const { tab } = useAppContext()
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 bg-gray-100 p-4 space-y-4">
        <div className='sticky top-3'>
          <h1 className="text-2xl font-bold">Nova</h1>
          <FileTree data={fileData} />
        </div>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}