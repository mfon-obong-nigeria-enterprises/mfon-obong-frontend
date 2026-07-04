import { useEffect, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

import {
  getAllProducts,
  getAllProductsByBranch,
} from "@/services/productService";
import { getAllCategories } from "@/services/categoryService";
import { getAllClients } from "@/services/clientService";
import {
  getAllTransactions,
  getTransactionByUserId,
  getTransactionsByBranch,
} from "@/services/transactionService";
import { getAllBranches } from "@/services/branchService";
import { getAllUsers } from "@/services/userService";
import { getSystemActivityLogs } from "@/services/activityLogService";

import { useInventoryStore } from "@/stores/useInventoryStore";
import { useTransactionsStore } from "@/stores/useTransactionStore";
import { useClientStore } from "@/stores/useClientStore";
import { useBranchStore } from "@/stores/useBranchStore";
import { useUserStore } from "@/stores/useUserStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useActivityLogsStore } from "@/stores/useActivityLogsStore";

const AppDataProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: isAuthLoading } = useAuthStore();
  const initAuth = useAuthStore((state) => (state as any).initAuth);

  // Get store setters only
  const setProducts = useInventoryStore((state) => state.setProducts);
  const setCategories = useInventoryStore((state) => state.setCategories);
  const setTransactions = useTransactionsStore(
    (state) => state.setTransactions
  );
  const setUsers = useUserStore((state) => state.setUsers);
  const setClients = useClientStore((state) => state.setClients);
  const setBranches = useBranchStore((state) => state.setBranches);
  const setActivities = useActivityLogsStore((state) => state.setActivities);

  // Helper functions for role checking
  const isSuperAdminOrHigher =
    user?.role && !["STAFF", "ADMIN"].includes(user.role);
  const isBranchUser = user?.role === "STAFF" || user?.role === "ADMIN";

  // Categories query - always enabled
  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: getAllCategories,
    enabled: !isAuthLoading,
  });

  // Products query - branch-aware
  const productsQuery = useQuery({
    queryKey: ["products", user?.role, user?.branchId],
    queryFn: () => {
      if (isBranchUser && user?.branchId) {
        return getAllProductsByBranch(user.branchId);
      }
      // Super admin sees all products
      return getAllProducts();
    },
    enabled: !isAuthLoading && !!user?.role,
  });

  // Transactions query - role and branch aware with explicit branch ID passing
  const transactionsQuery = useQuery({
    queryKey: ["transactions", user?.role, user?.branchId, user?.id],
    queryFn: () => {
      if (user?.role === "STAFF" && user?.id) {
        // Staff sees only their own transactions
        return getTransactionByUserId(user.id);
      }

      if (user?.role === "ADMIN" && user?.branchId) {
        // Admin sees all transactions in their branch
        return getTransactionsByBranch(user.branchId);
      }

      // Super admin sees all transactions
      return getAllTransactions();
    },
    enabled: !isAuthLoading && !!user?.role,
  });

  // Clients query - always enabled once auth loads
  const clientsQuery = useQuery({
    queryKey: ["clients", user?.role, user?.branchId],
    queryFn: getAllClients,
    enabled: !isAuthLoading,
  });

  // Branches query - only for super admin and higher roles
  const branchesQuery = useQuery({
    queryKey: ["branches"],
    queryFn: getAllBranches,
    enabled: !isAuthLoading && !!user && isSuperAdminOrHigher,
  });

  // Users query - only for super admin and higher roles
  const usersQuery = useQuery({
    queryKey: ["users"],
    queryFn: getAllUsers,
    enabled: !isAuthLoading && !!user && isSuperAdminOrHigher,
  });

  // Activities query - adjust based on role
  const activitiesQuery = useQuery({
    queryKey: ["activities", user?.role],
    queryFn: getSystemActivityLogs,
    enabled: !isAuthLoading && !!user && user.role !== "STAFF",
  });

  // Attempt silent session restore on mount, but only when not already authenticated
  useEffect(() => {
    const { isAuthenticated } = useAuthStore.getState();

    if (isAuthenticated) {
      // Session already restored from persisted store — skip the refresh call
      useAuthStore.setState({ loading: false });
      return;
    }

    // Not authenticated: try to restore from cookie/localStorage token
    const hasStoredToken = !!localStorage.getItem("__mfon_refresh_token");
    if (initAuth && hasStoredToken) {
      initAuth().catch(() => {});
    } else {
      // Nothing to restore — clear loading so the app renders the login page
      useAuthStore.setState({ loading: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync data to stores when available
  useEffect(() => {
    if (categoriesQuery.data && categoriesQuery.isSuccess) {
      setCategories(categoriesQuery.data);
    }
  }, [
    categoriesQuery.data,
    categoriesQuery.dataUpdatedAt,
    categoriesQuery.isSuccess,
    setCategories,
  ]);

  useEffect(() => {
    if (productsQuery.data && productsQuery.isSuccess) {
      setProducts(productsQuery.data);
    }
  }, [
    productsQuery.data,
    productsQuery.dataUpdatedAt,
    productsQuery.isSuccess,
    setProducts,
    user?.role,
  ]);

  useEffect(() => {
    if (transactionsQuery.data && transactionsQuery.isSuccess) {
      setTransactions(transactionsQuery.data);
    }
  }, [
    transactionsQuery.data,
    transactionsQuery.dataUpdatedAt,
    transactionsQuery.isSuccess,
    setTransactions,
    user?.role,
    user?.branchId,
  ]);

  useEffect(() => {
    if (clientsQuery.data && clientsQuery.isSuccess) {
      setClients(clientsQuery.data);
    }
  }, [
    clientsQuery.data,
    clientsQuery.dataUpdatedAt,
    clientsQuery.isSuccess,
    setClients,
  ]);

  useEffect(() => {
    if (branchesQuery.data && branchesQuery.isSuccess && isSuperAdminOrHigher) {
      setBranches(branchesQuery.data);
    }
  }, [
    branchesQuery.data,
    branchesQuery.dataUpdatedAt,
    branchesQuery.isSuccess,
    isSuperAdminOrHigher,
    setBranches,
  ]);

  useEffect(() => {
    if (usersQuery.data && usersQuery.isSuccess && isSuperAdminOrHigher) {
      setUsers(usersQuery.data);
    }
  }, [
    usersQuery.data,
    usersQuery.dataUpdatedAt,
    usersQuery.isSuccess,
    setUsers,
    isSuperAdminOrHigher,
  ]);

  useEffect(() => {
    if (activitiesQuery.data && activitiesQuery.isSuccess) {
      setActivities(activitiesQuery.data);
    }
  }, [
    activitiesQuery.data,
    activitiesQuery.dataUpdatedAt,
    activitiesQuery.isSuccess,
    setActivities,
  ]);

  return <>{children}</>;
};

// Main App Provider that wraps everything
export const AppProviderOptimized = ({ children }: { children: ReactNode }) => {
  return (
    <QueryClientProvider client={queryClient}>
      <AppDataProvider>{children}</AppDataProvider>
    </QueryClientProvider>
  );
};

// Keep the old export for backward compatibility
export { AppProviderOptimized as AppProvider };
