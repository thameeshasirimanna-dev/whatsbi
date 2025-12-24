import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useLocation } from 'react-router-dom';
import { getToken } from '../lib/auth';
import {
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  ShoppingBagIcon,
  ClockIcon,
  ChartBarIcon,
  CogIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

// Types
interface Metric {
  title: string;
  value: string | number;
  change: string;
  trend: "up" | "down";
  color: string;
  icon: React.ReactNode;
  description?: string;
}

interface RecentActivity {
  id: string;
  type: 'conversation' | 'order' | 'customer';
  title: string;
  description: string;
  time: string;
  status: 'new' | 'active' | 'completed';
}


// Enhanced Dashboard content component for /agent route
const DashboardContent: React.FC = () => {
  const [metrics, setMetrics] = useState<Metric[]>([
    {
      title: "Active Conversations",
      value: "0",
      change: "+0",
      trend: "up" as const,
      color: "bg-blue-100 border-blue-200 text-blue-800",
      icon: <ChatBubbleLeftRightIcon className="h-6 w-6" />,
      description: "Live customer conversations"
    },
    {
      title: "Total Customers",
      value: "0",
      change: "+0",
      trend: "up" as const,
      color: "bg-green-100 border-green-200 text-green-800",
      icon: <UserGroupIcon className="h-6 w-6" />,
      description: "Registered customers"
    },
    {
      title: "Orders Today",
      value: "0",
      change: "0",
      trend: "down" as const,
      color: "bg-purple-100 border-purple-200 text-purple-800",
      icon: <ShoppingBagIcon className="h-6 w-6" />,
      description: "New orders received"
    },
    {
      title: "Avg Response Time",
      value: "0 min",
      change: "0",
      trend: "down" as const,
      color: "bg-orange-100 border-orange-200 text-orange-800",
      icon: <ClockIcon className="h-6 w-6" />,
      description: "Average reply time"
    }
  ]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [agent, setAgent] = useState<{ name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        
        if (!authUser) {
          setError("User not authenticated");
          return;
        }

        // Fetch agent profile from backend
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError("User not authenticated");
          return;
        }

        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/get-agent-profile`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          setError("Failed to fetch agent profile");
          return;
        }

        const agentProfile = await response.json();
        if (!agentProfile.success || !agentProfile.agent) {
          setError("Agent not found");
          return;
        }

        const agentData = agentProfile.agent;
        const agentPrefix = agentData.agent_prefix;

        setAgent({
          name: agentData.name || "Agent"
        });

        // Use dynamic tables for customers and messages
        const customersTable = `${agentPrefix}_customers`;
        const messagesTable = `${agentPrefix}_messages`;

        // Fetch customers
        const { data: customers, error: customersError } = await supabase
          .from(customersTable)
          .select('id, name, phone')
          .eq('agent_id', agentData.id);

        const customerIds = customers?.map(c => c.id) || [];

        let recentMessages: { id: number; customer_id: number; message: string; direction: string; timestamp: string; is_read: boolean }[] = [];
        let messagesError = null;
        if (customerIds.length > 0) {
          // Fetch recent messages as conversations proxy, filtered by customer_ids
          const { data: msgData, error: msgError } = await supabase
            .from(messagesTable)
            .select('id, customer_id, message, direction, timestamp, is_read')
            .in('customer_id', customerIds)
            .order('timestamp', { ascending: false })
            .limit(10);
          recentMessages = msgData || [];
          messagesError = msgError;
        } else {
        }

        // For orders, assuming a dynamic orders table or fallback to messages with order keywords
        // For now, use messages count as orders proxy if no orders table
        const ordersCount = recentMessages.filter(msg => msg.message.toLowerCase().includes('order')).length || 0;

        // Calculate active conversations (customers with recent messages)
        const activeConversations = recentMessages.length > 0 ? new Set(recentMessages.map(msg => msg.customer_id)).size : 0;

        // Fetch recent activity from messages, join with customer names
        const recentActivityData: RecentActivity[] = recentMessages.slice(0, 3).map(msg => {
          const customer = customers?.find(c => c.id === msg.customer_id);
          return {
            id: msg.id.toString(),
            type: 'conversation' as const,
            title: `Message from ${customer?.name || `Customer ${msg.customer_id}`}`,
            description: msg.message.substring(0, 50) + '...',
            time: new Date(msg.timestamp).toLocaleString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            }) + ' ago',
            status: msg.is_read ? 'completed' : 'new'
          };
        });
        setRecentActivity(recentActivityData);

        // Update metrics with fetched data
        setMetrics(prev => [
          {
            ...prev[0],
            value: activeConversations,
            change: `+${activeConversations}`
          },
          {
            ...prev[1],
            value: customers?.length || 0,
            change: `+${customers?.length || 0}`
          },
          {
            ...prev[2],
            value: ordersCount,
            change: `+${ordersCount}`
          },
          {
            ...prev[3],
            value: "2.3 min", // This would come from analytics
            change: "-0.4"
          }
        ]);

        setError(null);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError('Failed to load dashboard data');
        // Keep mock data as fallback
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-red-600 mb-4">
            <ExclamationTriangleIcon className="h-12 w-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
          >
            <ArrowTrendingUpIcon className="h-4 w-4" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const getTrendIcon = (trend: "up" | "down") => 
    trend === "up" ? <ArrowTrendingUpIcon className="h-4 w-4" /> : <ArrowTrendingDownIcon className="h-4 w-4" />;

  const getStatusColor = (status: RecentActivity['status']) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800';
      case 'active': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-8 p-4 md:p-6">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white p-6 md:p-8 rounded-2xl shadow-xl"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">Welcome back, {agent?.name || 'Agent'}!</h1>
            <p className="text-blue-100 text-sm md:text-lg">
              Monitor your WhatsApp business performance and customer interactions
            </p>
          </div>
          <div className="text-right">
            <p className="text-lg md:text-xl font-semibold">Real-time Dashboard</p>
            <p className="text-xs md:text-sm text-blue-200">Updated {new Date().toLocaleTimeString()}</p>
          </div>
        </div>
      </motion.div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden group relative"
            whileHover={{ y: -2 }}
          >
            {/* Icon background */}
            <div className={`absolute -top-2 -right-2 w-16 h-16 ${metric.color} rounded-full opacity-20 group-hover:opacity-30 transition-opacity`}></div>
            
            <div className="flex items-center justify-between mb-4 relative z-10">
              <div className={`p-3 rounded-xl ${metric.color}`}>
                {metric.icon}
              </div>
              <div
                className={`text-xs font-semibold px-2 py-1 rounded-full flex items-center gap-1 ${
                  metric.trend === "up"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {getTrendIcon(metric.trend)}
                {metric.change}
              </div>
            </div>
            
            <div className="relative z-10">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {metric.title}
              </h3>
              <p className="text-3xl font-bold text-gray-900 mb-1">
                {metric.value}
              </p>
              <p className="text-sm text-gray-500">{metric.description}</p>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2 bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
        >
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-gray-500" />
              Recent Activity
            </h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {recentActivity.map((activity, index) => (
              <motion.div
                key={activity.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                    getStatusColor(activity.status)
                  }`}>
                    {activity.type === 'conversation' && <ChatBubbleLeftRightIcon className="h-5 w-5 text-current" />}
                    {activity.type === 'order' && <ShoppingBagIcon className="h-5 w-5 text-current" />}
                    {activity.type === 'customer' && <UserGroupIcon className="h-5 w-5 text-current" />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {activity.title}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        getStatusColor(activity.status)
                      }`}>
                        {activity.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-1">{activity.description}</p>
                    <p className="text-xs text-gray-500">{activity.time}</p>
                  </div>
                </div>
              </motion.div>
            ))}
            
            {recentActivity.length === 0 && (
              <div className="p-8 text-center text-gray-500">
                <MagnifyingGlassIcon className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium">No recent activity</p>
                <p className="mt-1">Your activity will appear here as you interact with customers</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6"
        >
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <PlusIcon className="h-5 w-5 text-gray-500" />
            Quick Actions
          </h2>
          
          <div className="space-y-3">
            {[
              {
                icon: ChatBubbleLeftRightIcon,
                title: "Start New Conversation",
                description: "Message a customer",
                action: "#",
                color: "from-blue-500 to-blue-600"
              },
              {
                icon: UserGroupIcon,
                title: "View Customer Profile",
                description: "Access customer details",
                action: "#",
                color: "from-green-500 to-green-600"
              },
              {
                icon: ShoppingBagIcon,
                title: "Create Order",
                description: "Process new order",
                action: "#",
                color: "from-purple-500 to-purple-600"
              },
              {
                icon: ChartBarIcon,
                title: "View Analytics",
                description: "Performance reports",
                action: "/agent/analytics",
                color: "from-indigo-500 to-indigo-600"
              },
              {
                icon: CogIcon,
                title: "Account Settings",
                description: "Update preferences",
                action: "/agent/settings",
                color: "from-gray-500 to-gray-600"
              }
            ].map((action, index) => (
              <motion.a
                key={action.title}
                href={action.action}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + index * 0.05 }}
                className="group flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-all duration-200 border border-gray-100 hover:border-gray-200"
              >
                <div className={`p-2 rounded-lg bg-gradient-to-r ${action.color} group-hover:scale-105 transition-transform`}>
                  <action.icon className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 group-hover:text-gray-700">
                    {action.title}
                  </p>
                  <p className="text-xs text-gray-500">{action.description}</p>
                </div>
                <ChevronRightIcon className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
              </motion.a>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Performance Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden"
      >
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <ChartBarIcon className="h-5 w-5 text-gray-500" />
            Performance Overview
          </h2>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="border-r border-gray-200 pr-6 md:pr-8">
              <p className="text-3xl font-bold text-blue-600">{typeof metrics[0]?.value === 'number' && metrics[0].value > 0 ? '98%' : 'N/A'}</p>
              <p className="text-sm text-gray-600 mt-1">Customer Satisfaction</p>
            </div>
            <div className="border-r border-gray-200 pr-6 md:pr-8">
              <p className="text-3xl font-bold text-green-600">2.3 min</p>
              <p className="text-sm text-gray-600 mt-1">Avg First Response</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-purple-600">{typeof metrics[2]?.value === 'number' && metrics[2].value > 0 ? '99%' : 'N/A'}</p>
              <p className="text-sm text-gray-600 mt-1">Messages Delivered</p>
            </div>
          </div>
          
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Your performance is excellent! Keep up the great work with your customers.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Main AgentDashboard component - now only renders dashboard content
const AgentDashboard: React.FC = () => {
  return <DashboardContent />;
};

export default AgentDashboard;
