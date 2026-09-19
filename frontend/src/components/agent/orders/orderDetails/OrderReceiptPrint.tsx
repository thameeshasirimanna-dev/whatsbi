import React from 'react';
import { OrderDetails, BusinessType } from './types';

interface OrderReceiptPrintProps {
  order: OrderDetails;
  businessType?: BusinessType;
}

export const OrderReceiptPrint: React.FC<OrderReceiptPrintProps> = ({
  order,
  businessType = 'product',
}) => {
  const isService = businessType === 'service';

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-receipt, #print-receipt * { visibility: visible; }
          #print-receipt { position: absolute; left: 0; top: 0; width: 100%; background: white; padding: 20px; font-family: Arial, sans-serif; font-size: 12pt; }
          .no-print { display: none !important; }
          @page { margin: 0.5in; size: A4; }
        }
      `}</style>

      <div id="print-receipt" className="hidden print:block">
        <div style={{ border: '1px solid #ccc', padding: 24, maxWidth: 800, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
              {isService ? 'SERVICE RECEIPT / INVOICE' : 'ORDER RECEIPT'}
            </h1>
            <p style={{ fontSize: 16 }}>
              {isService ? 'Booking' : 'Order'} #{order.id.toString().padStart(4, '0')}
            </p>
            <p style={{ fontSize: 12, marginTop: 4 }}>
              Date: {new Date(order.created_at).toLocaleDateString('en-US')}
            </p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontWeight: 600, marginBottom: 8 }}>
              {isService ? 'Client Information' : 'Customer Information'}
            </h3>
            <p><strong>Name:</strong> {order.customer_name}</p>
            <p><strong>Phone:</strong> {order.customer_phone}</p>
            {order.order_details.shipping_address && (
              <p style={{ marginTop: 8 }}>
                <strong>{isService ? 'Service Location:' : 'Shipping:'}</strong> {order.order_details.shipping_address}
              </p>
            )}
            {order.estimated_delivery_date && (
              <p style={{ marginTop: 4 }}>
                <strong>{isService ? 'Scheduled Date:' : 'Estimated Delivery:'}</strong>{' '}
                {new Date(order.estimated_delivery_date).toLocaleDateString('en-US')}
              </p>
            )}
          </div>

          <div style={{ marginBottom: 16 }}>
            <h3 style={{ fontWeight: 600, marginBottom: 8 }}>
              {isService ? 'Booked Services' : 'Order Items'}
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ccc' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #ccc' }}>
                  {[isService ? 'Service / Package' : 'Item', 'Qty', 'Price', 'Total'].map(h => (
                    <th key={h} style={{ textAlign: h.startsWith('Service') || h === 'Item' ? 'left' : 'right', padding: '6px 8px', border: '1px solid #ccc' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {order.order_details.items.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '6px 8px', border: '1px solid #ccc' }}>{item.name}</td>
                    <td style={{ textAlign: 'right', padding: '6px 8px', border: '1px solid #ccc' }}>{item.quantity}</td>
                    <td style={{ textAlign: 'right', padding: '6px 8px', border: '1px solid #ccc' }}>Rs. {item.price.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', padding: '6px 8px', border: '1px solid #ccc', fontWeight: 600 }}>Rs. {item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} style={{ textAlign: 'right', padding: '6px 8px', border: '1px solid #ccc', fontWeight: 700 }}>TOTAL:</td>
                  <td style={{ textAlign: 'right', padding: '6px 8px', border: '1px solid #ccc', fontWeight: 700 }}>Rs. {order.order_details.total_amount.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {order.order_details.notes && (
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontWeight: 600, marginBottom: 6 }}>
                {isService ? 'Service Notes' : 'Notes'}
              </h3>
              <p style={{ fontStyle: 'italic', border: '1px solid #ccc', padding: 8 }}>{order.order_details.notes}</p>
            </div>
          )}

          <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 16, borderTop: '1px solid #ccc' }}>
            <p style={{ fontSize: 12 }}>Status: <strong>{(order.status || 'PENDING').toUpperCase()}</strong></p>
            <p style={{ fontSize: 12, marginTop: 6 }}>Thank you for your business!</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default OrderReceiptPrint;
