import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Icon } from "@iconify/react";

// hooks
import { useLogout } from "@/hooks/uselogout";

// components
import Logo from "@/components/Logo";
import LogoutConfirmModal from "../dashboard/shared/LogoutConfirmModal";

// ui
import {
  Sidebar,
  SidebarContent,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
} from "@/components/ui/sidebar";

// SIDEBAR ITEMS — ICONIFY ONLY
const items = [
  {
    title: "Dashboard",
    url: "/manager/dashboard/m-overview",
    icon: "material-symbols:dashboard-outline",
  },
  {
    title: "Business Report",
    url: "/manager/dashboard/business-report",
    icon: "material-symbols:business-center-outline-rounded",
  },
  {
    title: "Clients",
    url: "/manager/dashboard/manage-clients",
    icon: "material-symbols:groups-outline",
  },
  {
    title: "Transaction",
    url: "/manager/dashboard/manage-transactions",
    icon: "material-symbols:send-money",
  },
  {
    title: "Revenue Analytics",
    url: "/manager/dashboard/revenue-analytics",
    icon: "material-symbols:analytics-outline-rounded",
  },
  {
    title: "User Management",
    url: "/manager/dashboard/manage-user",
    icon: "mingcute:user-setting-line",
  },
  {
    title: "Warehouse",
    url: "/manager/dashboard/warehouse",
    icon: "material-symbols:warehouse-outline",
  },
  {
    title: "Notifications",
    url: "/manager/dashboard/manager-notifications",
    icon: "material-symbols:notifications-outline",
  },
  // {
  //   title: "Settings",
  //   url: "/manager/dashboard/manager-settings",
  //   icon: "material-symbols:settings-outline-rounded",
  // },
];

interface ManagerSidebarProps {
  onLogoutClick: () => void;
}

const ManagerSidebar = ({ onLogoutClick }: ManagerSidebarProps) => {
  const { pathname } = useLocation();
  //const navigate = useNavigate();

  return (
    <Sidebar>
      <SidebarHeader />
      <Logo />

      <SidebarContent className="pt-8">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Back Button */}
              {/* <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => navigate(-1)}
                  className="cursor-pointer rounded-sm p-6 my-1 flex items-center gap-3 bg-[#F4E8E7] hover:bg-[#8C1C1380] hover:text-white transition-all"
                >
                  <Icon icon="material-symbols:arrow-back" width={20} />
                  <span>Back</span>
                </SidebarMenuButton>
              </SidebarMenuItem> */}

              {/* Menu Items */}
              {items.map((item) => {
                const isActive = pathname.startsWith(item.url);

                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className={`rounded-sm p-6 my-1 flex items-center gap-3 transition-all
                        ${
                          isActive
                            ? "bg-[#8C1C1380] text-white"
                            : "bg-[#F4E8E7] text-[#333]"
                        }
                        hover:bg-[#8C1C1380] hover:text-white
                      `}
                    >
                      <NavLink to={item.url}>
                        <Icon
                          icon={item.icon}
                          width={28}
                          height={28}
                          className="shrink-0 font-bold"
                        />
                        <span>{item.title}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenuButton
          onClick={onLogoutClick}
          className="flex items-center gap-3"
        >
          <Icon icon="material-symbols:logout" width={20} />
          <span>Logout</span>
        </SidebarMenuButton>
      </SidebarFooter>
    </Sidebar>
  );
};

// WRAPPER WITH MODAL
const ManagerSidebarWithModal = () => {
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const logoutMutation = useLogout();

  const handleConfirm = () => {
    setIsLoading(true);
    setTimeout(() => {
      logoutMutation.mutate();
      setIsLoading(false);
      setShowModal(false);
    }, 500);
  };

  return (
    <>
      <ManagerSidebar onLogoutClick={() => setShowModal(true)} />
      <LogoutConfirmModal
        isOpen={showModal}
        onClose={() => !isLoading && setShowModal(false)}
        onConfirm={handleConfirm}
        isLoading={isLoading}
      />
    </>
  );
};

export default ManagerSidebarWithModal;
