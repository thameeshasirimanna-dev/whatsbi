import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { useNavigate, Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';
import { Agent } from '../../../types';
import { getCurrentAgent } from '../../../lib/supabase';

interface AgentLayoutProps {
  children?: React.ReactNode;
}

const AgentLayout: React.FC<AgentLayoutProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const agentFetchedRef = useRef(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);

  const displayAgent = useMemo(() => {
    if (loading) {
      return {
        id: '',
        user_id: '',
        name: 'Loading...',
        email: '',
        agent_prefix: 'WA',
        role: 'agent' as const,
        credits: 0,
        created_at: new Date().toISOString(),
      };
    }
    return agent || {
      id: '',
      user_id: '',
      name: 'Not logged in',
      email: '',
      agent_prefix: 'WA',
      role: 'agent' as const,
      credits: 0,
      created_at: new Date().toISOString(),
    };
  }, [agent, loading]);

  const navigate = useNavigate();

  const handleNotificationClick = useCallback((notification: any) => {
    navigate(`/agent/conversations?customerId=${notification.customerId}`);
    setRecentNotifications(prev => prev.filter(n => n.id !== notification.id));
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, [navigate]);

  const navbarProps = {
    ...displayAgent,
    unreadCount,
    recentNotifications,
    onNotificationClick: handleNotificationClick,
  };

  useEffect(() => {
    const fetchAgent = async () => {
      if (agentFetchedRef.current) {
        return;
      }
      setLoading(true);
      const currentAgent = await getCurrentAgent();
      setAgent(currentAgent);
      agentFetchedRef.current = true;
      setLoading(false);

      // Fetch unread count and recent notifications
      if (currentAgent && currentAgent.agent_prefix) {
        const messagesTable = `${currentAgent.agent_prefix}_messages`;
        const customersTable = `${currentAgent.agent_prefix}_customers`;

        // Fetch unread count
        const { count, error: countError } = await supabase
          .from(messagesTable)
          .select('*', { count: 'exact', head: true })
          .eq('direction', 'inbound')
          .eq('is_read', false);
        if (!countError && count !== null) {
          setUnreadCount(count);
        }

        // Fetch recent 5 unread messages
        const { data: unreadMessages, error: unreadError } = await supabase
          .from(messagesTable)
          .select('id, message, timestamp, customer_id')
          .eq('direction', 'inbound')
          .eq('is_read', false)
          .order('timestamp', { ascending: false })
          .limit(5);

        if (!unreadError && unreadMessages && unreadMessages.length > 0) {
          const customerIds = [...new Set(unreadMessages.map((msg: any) => msg.customer_id))];
          const { data: customers, error: customerError } = await supabase
            .from(customersTable)
            .select('id, name, phone')
            .in('id', customerIds);

          if (!customerError && customers) {
            const customerMap = new Map(customers.map((c: any) => [c.id, c]));
            setRecentNotifications(unreadMessages.map((msg: any) => {
              const customer = customerMap.get(msg.customer_id);
              return {
                id: msg.id,
                customerName: customer ? customer.name : `Customer ${msg.customer_id}`,
                customerPhone: customer ? customer.phone : '',
                customerId: msg.customer_id,
                preview: msg.message.length > 50 ? `${msg.message.substring(0, 50)}...` : msg.message,
                timestamp: new Date(msg.timestamp).toLocaleString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              };
            }));
          }
        } else {
          setRecentNotifications([]);
        }
      }
    };

    fetchAgent();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && !agent) {
        fetchAgent();
      } else if (event === 'SIGNED_OUT') {
        setAgent(null);
        setUnreadCount(0);
        setRecentNotifications([]);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Realtime subscription for unread notifications
  useEffect(() => {
    if (!agent?.agent_prefix || !agent?.id) return;

    const messagesTable = `${agent.agent_prefix}_messages`;
    const channel = supabase
      .channel(`unread-notifications-${agent.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: messagesTable,
          filter: 'direction=eq.inbound',
        },
        async (payload) => {
          const newMsg = payload.new;
          if (!newMsg.is_read) {
            setUnreadCount((prev) => prev + 1);

            const customersTable = `${agent.agent_prefix}_customers`;
            const { data: customer, error } = await supabase
              .from(customersTable)
              .select('name, phone')
              .eq('id', newMsg.customer_id)
              .single();

            if (!error && customer) {
              const preview = newMsg.message ? (newMsg.message.length > 50 ? `${newMsg.message.substring(0, 50)}...` : newMsg.message) : '';
              const notif = {
                id: newMsg.id,
                customerName: customer.name || `Customer ${newMsg.customer_id}`,
                customerPhone: customer.phone || '',
                customerId: newMsg.customer_id,
                preview,
                timestamp: new Date(newMsg.timestamp).toLocaleString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                }),
              };
              setRecentNotifications((prev) => {
                const updated = [notif, ...prev];
                return updated.length > 5 ? updated.slice(0, 5) : updated;
              });
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: messagesTable,
          filter: 'direction=eq.inbound',
        },
        (payload) => {
          const oldMsg = payload.old;
          const newMsg = payload.new;
          if (oldMsg.is_read === false && newMsg.is_read === true) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
            setRecentNotifications((prev) => prev.filter((n) => n.id !== newMsg.id));
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Subscribed to unread notifications');
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [agent?.agent_prefix, agent?.id]);

  // Listen for bulk read events from ConversationsPage
  useEffect(() => {
    const handleUnreadMarked = (event: CustomEvent) => {
      const { customerId, count } = event.detail;
      setUnreadCount((prev) => Math.max(0, prev - count));
      setRecentNotifications((prev) => prev.filter((n) => n.customerId !== customerId));
    };

    const handleUnreadReceived = (event: CustomEvent) => {
      const { count, messageData } = event.detail;
      setUnreadCount((prev) => prev + count);
      if (messageData) {
        const notif = {
          id: messageData.id,
          customerName: messageData.customerName,
          customerPhone: messageData.customerPhone,
          customerId: messageData.customer_id,
          preview: messageData.message.length > 50 ? `${messageData.message.substring(0, 50)}...` : messageData.message,
          timestamp: messageData.timestamp,
        };
        setRecentNotifications((prev) => {
          const updated = [notif, ...prev];
          return updated.length > 5 ? updated.slice(0, 5) : updated;
        });
      }
    };

    window.addEventListener('unread-messages-read', handleUnreadMarked as EventListener);
    window.addEventListener('unread-message-received', handleUnreadReceived as EventListener);

    return () => {
      window.removeEventListener('unread-messages-read', handleUnreadMarked as EventListener);
      window.removeEventListener('unread-message-received', handleUnreadReceived as EventListener);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading agent...</p>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Agent Not Found</h2>
          <p className="text-gray-600 mb-4">Please log in as an agent or contact administrator.</p>
          <button
            onClick={() => window.location.href = '/login'}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col">
      {/* Top Navbar */}
      <Navbar
        agent={navbarProps}
        collapsed={sidebarCollapsed}
        onMenuClick={() => setSidebarOpen(true)}
        onLogout={async () => {
          // Handle logout
          if (confirm('Are you sure you want to logout?')) {
            const { error } = await supabase.auth.signOut();
            if (error) {
              console.error('Logout error:', error);
            }
            window.location.href = '/login';
          }
        }}
      />
      
      <div className="flex flex-1 overflow-hidden h-full">
        {/* Sidebar */}
        <Sidebar
          agent={displayAgent}
          unreadCount={unreadCount}
          open={sidebarOpen}
          collapsed={sidebarCollapsed}
          onCollapseToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          onClose={() => setSidebarOpen(false)}
        />
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto relative z-0 transition-all duration-300 h-full ease-in-out">
          <div className="h-full">
            <div className="w-full h-full">
              {/* Page content */}
              <div className="h-full">
                <Outlet />
                {children}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default AgentLayout;