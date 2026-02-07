// src/context/AppContext.tsx
import { createContext, useContext, useState } from "react";
import React from "react";

const AppContext = createContext<null | any>({});

export function AppContextProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState("Dashboard")
  return (
    <AppContext.Provider value={{ isAdmin, setIsAdmin, tab, setTab }}>
      {children}
    </AppContext.Provider>
  );
}

export const useAppContext = () => useContext(AppContext);
