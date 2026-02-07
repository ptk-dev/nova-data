import { createBrowserRouter } from 'react-router-dom';
import DashboardPage from '../features/dashboard/DashboardPage';
import AnalyticsPage from '../features/analytics/AnalyticsPage';
import SourcesPage from '../features/sources/SourcesPage';
import MainLayout from '../layouts/MainLayout';
import React from "react";
import { SourcePage } from '../features/sources/SourcePage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <MainLayout><DashboardPage /></MainLayout>,
  },
  {
    path: '/analytics',
    element: <MainLayout><AnalyticsPage /></MainLayout>,
  },
  {
    path: '/sources',
    element: <MainLayout><SourcesPage /></MainLayout>,
  },
  {
    path: "/sources/:id",
    element: <MainLayout><SourcePage /></MainLayout>
  }
]);

