import { createBrowserRouter, Navigate } from "react-router-dom";
import ProtectedRoute from "@/components/ProtectedRoute";


// Auth
import Login from "@/features/auth/Login";
import Notfound from "@/components/Notfound";

// Manager
import ManagerDashboardLayout from "@/layout/ManagerDashboardLayout";
import ManagerDashboardOverview from "@/features/dashboard/manager/ManagerDashboardOverview";
import BusinessReport from "@/features/dashboard/manager/BusinessReport";
import ManagerTransactions from "@/features/dashboard/manager/ManagerTransactions";
import ManagerClients from "@/features/dashboard/manager/ManagerClients";
import RevenueAnalytics from "@/features/dashboard/manager/RevenueAnalytics";
import UserManagement from "@/features/dashboard/manager/UserManagement";
import ManagerSettings from "@/features/dashboard/manager/ManagerSettings";
import ManagerNotifications from "@/features/dashboard/manager/ManagerNotifications";

// Modal Page - removed unused import

// Maintainer
import MaintainerLayout from "@/layout/MaintainerLayout";
import MaintainerDashboard from "@/features/dashboard/maintainer/MaintainerDashboard";
import ActivityLog from "@/features/dashboard/maintainer/ActivityLog";
import MaintainerSettings from "@/features/dashboard/maintainer/MaintainerSettings";
import MaintainerNotification from "@/features/dashboard/maintainer/MaintainerNotification";
import ColumnSettings from "@/features/dashboard/shared/usermanagement/columnsettings";
import ManageUser from "@/features/dashboard/maintainer/ManageUser";

// Admin
import AdminDashboardLayout from "@/layout/AdminDashboardLayout";
import DashboardOverview from "@/features/dashboard/admin/DashboardOverview";
import AdminInventory from "@/features/dashboard/admin/AdminInventory";
import Clients from "@/features/dashboard/admin/Clients";
import DashboardSales from "@/features/dashboard/admin/DashboardSales";
import DashboardTransactions from "@/features/dashboard/admin/DashboardTransactions";
import { DashboardSettings } from "@/features/dashboard/admin/DashboardSettings";
import AdminNotification from "@/features/dashboard/admin/AdminNotification";

// Staff
import StaffDashboardLayout from "@/layout/StaffDashboardLayout";
import StaffDashboardOverview from "@/features/dashboard/staff/DashboardOverview";
import StaffSales from "@/features/dashboard/staff/StaffSales";
import NewSales from "@/features/dashboard/staff/NewSales";
import Stock from "@/features/dashboard/staff/Stock";
import StaffClients from "@/features/dashboard/staff/StaffClients";

// Shared
import UserDetailsPage from "@/features/dashboard/shared/usermanagement/userdetailpage";
import AddProduct from "@/features/dashboard/shared/inventory/AddProduct";
import ClientDetailsPage from "@/pages/ClientDetailsPage";
import ImportStockPage from "@/features/import/ImportStockPage";
import UserLog from "@/features/dashboard/manager/component/UserLog";
import WarehouseListPage from "@/features/dashboard/manager/warehouse/WarehouseListPage";
import WarehouseDetailPage from "@/features/dashboard/manager/warehouse/WarehouseDetailPage";

const router = createBrowserRouter([
  { path: "/", element: <Login /> },

  // Manager Routes - Only for SUPER_ADMIN
  {
    path: "/manager/dashboard",
    element: (
      <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
        <ManagerDashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="m-overview" replace /> },
      { path: "m-overview", element: <ManagerDashboardOverview /> },
      { path: "business-report", element: <BusinessReport /> },
      { path: "manage-clients", element: <ManagerClients /> },
      { path: "manage-transactions", element: <ManagerTransactions /> },
      { path: "revenue-analytics", element: <RevenueAnalytics /> },
      { path: "manage-user", element: <UserManagement /> },
      { path: "manager-settings", element: <ManagerSettings /> },
      { path: "manager-notifications", element: <ManagerNotifications /> },
      { path: "user-management/:id", element: <UserDetailsPage /> },
      { path: "user-management/col-settings", element: <ColumnSettings /> },
      { path: "user-log", element: <UserLog/> },
      { path: "warehouse", element: <WarehouseListPage /> },
      { path: "warehouse/:id", element: <WarehouseDetailPage /> },
    ],
  },

  // Maintainer Routes - Only for MAINTAINER
  {
    path: "/maintainer/dashboard",
    element: (
      <ProtectedRoute allowedRoles={["MAINTAINER"]}>
        <MaintainerLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        index: true,
        element: <Navigate to="/maintainer/dashboard/overview" replace />,
      },
      { path: "overview", element: <MaintainerDashboard /> },
      { path: "maintainer-notifications", element: <MaintainerNotification /> },
      { path: "maintainer-settings", element: <MaintainerSettings /> },
      { path: "user-management", element: <ManageUser /> },
      { path: "user-management/:id", element: <UserDetailsPage /> },
      { path: "user-management/col-settings", element: <ColumnSettings /> },
      { path: "log", element: <ActivityLog /> },
      { path: "settings", element: <MaintainerSettings /> },
    ],
  },

  // Admin Routes - Only for ADMIN
  {
    path: "/admin/dashboard",
    element: (
      <ProtectedRoute allowedRoles={["ADMIN"]}>
        <AdminDashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="overview" replace /> },
      { path: "overview", element: <DashboardOverview /> },
      { path: "inventory", element: <AdminInventory /> },
      { path: "clients", element: <Clients /> },
      { path: "sales", element: <DashboardSales /> },
      { path: "sale", element: <NewSales /> },
      { path: "transactions", element: <DashboardTransactions /> },
      { path: "settings", element: <DashboardSettings /> },
      { path: "admin-notifications", element: <AdminNotification /> },
    ],
  },

  // Staff Routes - Only for STAFF
  {
    path: "/staff/dashboard",
    element: (
      <ProtectedRoute allowedRoles={["STAFF"]}>
        <StaffDashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="s-overview" replace /> },
      { path: "s-stock", element: <Stock /> },
      { path: "s-clients", element: <StaffClients /> },
      { path: "s-overview", element: <StaffDashboardOverview /> },
      { path: "s-sales", element: <StaffSales /> },
      { path: "new-sales", element: <NewSales /> },
    ],
  },

  // Other Routes - Protected but no specific role required
  { 
    path: "add-prod", 
    element: (
      <ProtectedRoute>
        <AddProduct />
      </ProtectedRoute>
    ) 
  },
  { 
    path: "clients/:clientId", 
    element: (
      <ProtectedRoute>
        <ClientDetailsPage />
      </ProtectedRoute>
    ) 
  },
  { 
    path: "import-stock", 
    element: (
      <ProtectedRoute>
        <ImportStockPage />
      </ProtectedRoute>
    ) 
  },
  { path: "*", element: <Notfound /> },
]);

export default router;