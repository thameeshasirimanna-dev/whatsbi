import React, { useState } from 'react';
import { useLocation, useNavigate } from "react-router-dom";
import {
  BellIcon,
  UserCircleIcon,
  ArrowRightOnRectangleIcon,
  Bars3Icon,
  CurrencyDollarIcon,
} from "@heroicons/react/24/outline";

interface Notification {
  id: number;
  customerName: string;
  customerPhone: string;
  customerId: number;
  preview: string;
  timestamp: string;
}

interface NavbarProps {
  agent: {
    name: string;
    email: string;
    agent_prefix: string;
    credits: number;
  } & {
    unreadCount: number;
    recentNotifications: Notification[];
    onNotificationClick: (notification: Notification) => void;
  };
  onMenuClick: () => void;
  onLogout: () => void;
  collapsed?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({
  agent,
  onMenuClick,
  onLogout,
  collapsed = false,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);

  const toggleNotifications = () => {
    setIsNotificationOpen(!isNotificationOpen);
  };

  const closeNotifications = () => {
    setIsNotificationOpen(false);
  };
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const getPageTitle = () => {
    const path = location.pathname;
    const segments = path.split("/").filter(Boolean);

    if (segments.length < 2) return "Dashboard";
    const pageSegment = segments[1];
    if (pageSegment === "dashboard") return "Dashboard";
    if (pageSegment === "conversations") return "Conversations";
    if (pageSegment === "customers") return "Customers";
    if (pageSegment === "orders")
      return segments.length > 2 ? "Order Details" : "Orders";
    if (pageSegment === "appointments") return "Appointments";
    if (pageSegment === "services") return "Services";
    if (pageSegment === "inventory") return "Inventory";
    if (pageSegment === "invoices") return "Invoices";
    if (pageSegment === "templates") return "Templates";
    if (pageSegment === "analytics") return "Analytics";
    if (pageSegment === "settings") return "Settings";

    return "Dashboard";
  };

  const getPageSubtitle = () => {
    const path = location.pathname;
    const segments = path.split("/").filter(Boolean);

    if (segments.length < 2) return "Overview of your business";
    const pageSegment = segments[1];
    if (pageSegment === "dashboard") return "Overview of your business";
    if (pageSegment === "conversations") return "Manage your conversations";
    if (pageSegment === "customers")
      return "Manage your customer base and insights";
    if (pageSegment === "orders")
      return segments.length > 2 ? "Order details" : "Manage your orders";
    if (pageSegment === "appointments")
      return "Schedule and manage appointments";
    if (pageSegment === "services") return "Manage your services";
    if (pageSegment === "inventory") return "Manage your inventory";
    if (pageSegment === "invoices") return "Create and send invoices";
    if (pageSegment === "templates") return "Manage message templates";
    if (pageSegment === "analytics") return "View your analytics";
    if (pageSegment === "settings") return "Configure your settings";

    return "Overview of your business";
  };

  const pageTitle = getPageTitle();
  const pageSubtitle = getPageSubtitle();

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 py-2">
      <div
        className={`
        w-full
        px-4 sm:px-6
        md:${collapsed ? "pl-16 pr-6" : "pl-64 pr-6"}
        lg:${collapsed ? "pl-16 pr-8" : "pl-64 pr-8"}
      `}
      >
        <div className="flex justify-between h-16 items-center w-full">
          {/* Left: Menu Button (Mobile) and Logo */}
          <div className="flex items-center space-x-4">
            <button
              onClick={onMenuClick}
              className="md:hidden p-2 text-gray-500 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Open sidebar"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>

            <div className="block">
              <span className="text-xl font-bold text-gray-900 block">
                {pageTitle}
              </span>
              <span className="text-sm text-gray-600 block">
                {pageSubtitle}
              </span>
            </div>
          </div>

          {/* Right: Notifications, User Menu */}
          <div className="flex items-center space-x-4">
            {/* Credits */}
            <div className="flex items-center space-x-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
              <CurrencyDollarIcon className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">
                Credits: {agent.credits}
              </span>
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={toggleNotifications}
                className="relative p-2.5 text-gray-400 hover:text-gray-500 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <BellIcon className="h-5 w-5" />
                {agent.unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[20px] h-5 flex items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold ring-2 ring-white">
                    {agent.unreadCount > 99 ? "99+" : agent.unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {isNotificationOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 py-1 z-50 max-h-96 overflow-y-auto">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <h3 className="text-sm font-medium text-gray-900">
                      Notifications
                    </h3>
                    <p className="text-xs text-gray-500">
                      {agent.unreadCount} unread messages
                    </p>
                  </div>
                  {agent.recentNotifications.length > 0 ? (
                    agent.recentNotifications.map((notification) => (
                      <button
                        key={notification.id}
                        onClick={() => {
                          agent.onNotificationClick(notification);
                          closeNotifications();
                        }}
                        className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-medium text-sm">
                                {notification.customerName
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .toUpperCase()
                                  .slice(0, 2)}
                              </span>
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {notification.customerName}
                            </p>
                            <p className="text-sm text-gray-500 truncate mt-1">
                              {notification.preview}
                            </p>
                            <p className="text-xs text-gray-400 mt-1">
                              {notification.timestamp}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-4 text-center text-gray-500">
                      <BellIcon className="mx-auto h-6 w-6 text-gray-400 mb-2" />
                      <p className="text-sm">No new notifications</p>
                    </div>
                  )}
                  <div className="px-4 py-2 border-t border-gray-200">
                    <button
                      onClick={() => {
                        navigate("/agent/conversations");
                        closeNotifications();
                      }}
                      className="w-full text-left text-sm text-blue-600 hover:text-blue-500 font-medium"
                    >
                      View all conversations
                    </button>
                  </div>
                </div>
              )}

              {/* Click outside to close */}
              {isNotificationOpen && (
                <div
                  className="fixed inset-0 z-40"
                  onClick={closeNotifications}
                />
              )}
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-3">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-sm font-medium text-gray-900">
                  {agent.name}
                </span>
                <span className="text-xs text-gray-500">{agent.email}</span>
              </div>

              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  agent.name
                    ? "bg-green-100 text-green-800"
                    : "bg-gray-300 text-gray-600"
                }`}
              >
                {agent.name ? (
                  getInitials(agent.name)
                ) : (
                  <UserCircleIcon className="h-6 w-6" />
                )}
              </div>
            </div>

            {/* Logout Button */}
            <button
              onClick={onLogout}
              className="hidden md:flex items-center space-x-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-200"
            >
              <ArrowRightOnRectangleIcon className="h-4 w-4" />
              <span>Logout</span>
            </button>

            {/* Mobile Logout */}
            <button
              onClick={onLogout}
              className="md:hidden p-2 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Logout"
            >
              <ArrowRightOnRectangleIcon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;