import React from "react";
import { getToken } from "../../../lib/auth";
import { Order } from "../../../types/index";

interface OrdersTabProps {
  orders: Order[];
  customerId: number | null;
  loading: boolean;
  agentPrefix: string | null;
  agentId: number | null;
  customerName: string;
  customerPhone: string | null;
  onViewOrder: (order: Order) => void;
  onEditOrder: (order: Order) => void;
  onGenerateInvoice: (orderId: number, defaultName: string) => void;
  onDeleteOrder: (orderId: number) => void;
  onRefresh: () => void;
}

const OrdersTab: React.FC<OrdersTabProps> = ({
  orders,
  customerId,
  loading,
  agentPrefix,
  agentId,
  customerName,
  customerPhone,
  onViewOrder,
  onEditOrder,
  onGenerateInvoice,
  onDeleteOrder,
  onRefresh,
}) => {
  const handleDelete = async (orderId: number) => {
    if (
      window.confirm(
        `Are you sure you want to delete Order #${orderId}? This action cannot be undone.`
      )
    ) {
      try {
        if (!agentPrefix) {
          throw new Error("Missing agent prefix");
        }
        const token = getToken();
        const deleteResponse = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/manage-orders?id=${orderId}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        const deleteData = await deleteResponse.json();
        if (!deleteResponse.ok || !deleteData.success) {
          throw new Error(deleteData.message || "Failed to delete order");
        }
        onRefresh();
      } catch (err: any) {
        alert("Failed to delete order: " + err.message);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <>
      {orders.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No orders found for this customer.
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-gray-900">
                  Order #{order.id.toString().padStart(4, "0")}
                </h3>
                <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${
                    order.status === "completed"
                      ? "bg-green-100 text-green-800"
                      : order.status === "pending"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  {order.status}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Total: LKR {Number(order.total_amount)?.toFixed(2) || "0.00"}
              </p>
              <p className="text-xs text-gray-500">
                Placed on: {new Date(order.created_at).toLocaleDateString()}
              </p>
              {/* Actions */}
              <div className="flex flex-wrap gap-2 mt-3 pt-2 border-t border-gray-100">
                <button
                  onClick={() => onViewOrder(order)}
                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors flex items-center space-x-1"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                  <span>View</span>
                </button>
                <button
                  onClick={() => onEditOrder(order)}
                  className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors flex items-center space-x-1"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  <span>Edit</span>
                </button>
                <button
                  onClick={() =>
                    onGenerateInvoice(
                      order.id,
                      `Invoice for Order #${order.id
                        .toString()
                        .padStart(4, "0")}`
                    )
                  }
                  className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 transition-colors flex items-center space-x-1"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <span>Generate Invoice</span>
                </button>
                <button
                  onClick={() => handleDelete(order.id)}
                  className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors flex items-center space-x-1"
                >
                  <svg
                    className="w-3 h-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
};

export default OrdersTab;