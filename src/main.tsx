import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles/globals.css';
import { AppContextProvider } from './context/AppContext';
import {QueryClient, QueryClientProvider} from "@tanstack/react-query"

const client = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={client}>
    <AppContextProvider>
      <App />
    </AppContextProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
