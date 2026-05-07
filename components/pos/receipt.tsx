'use client';

import { useRef } from 'react';
import QRCode from 'qrcode.react';

interface SaleData {
  id: string;
  customerId?: string;
  totalAmount: number;
  discount: number;
  tax: number;
  createdAt: string;
  items: {
    name: string;
    serialNumber?: string;
    qty: number;
    price: number;
    subtotal: number;
  }[];
  payments: {
    method: string;
    amount: number;
  }[];
}

interface ReceiptProps {
  sale: SaleData;
  shopName?: string;
  shopAddress?: string;
  shopPhone?: string;
  portalUrl?: string; // Base URL for customer portal
}

export const Receipt = ({
  sale,
  shopName = 'SwanAar II Electronics',
  shopAddress = '',
  shopPhone = '',
  portalUrl = 'http://localhost:3000/customer',
}: ReceiptProps) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    const printWindow = window.open('', '', 'height=600,width=400');
    if (printWindow && receiptRef.current) {
      printWindow.document.write(receiptRef.current.innerHTML);
      printWindow.document.close();
      printWindow.print();
    }
  };

  // QR code for customer portal (check repair status)
  const portalLink = sale.customerId
    ? `${portalUrl}/${sale.id}?customer=${sale.customerId}`
    : null;

  const subtotal = sale.totalAmount + sale.discount - sale.tax;
  const discountAmount = sale.discount;
  const taxAmount = sale.tax;
  const totalDue = sale.totalAmount;

  return (
    <>
      <div
        ref={receiptRef}
        style={{
          width: '80mm',
          margin: '0 auto',
          padding: '2mm',
          fontFamily: 'monospace',
          fontSize: '11px',
          lineHeight: '1.4',
          color: '#000',
          backgroundColor: '#fff',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '8px', borderBottom: '1px dashed #000', paddingBottom: '4px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{shopName}</div>
          {shopAddress && <div style={{ fontSize: '9px' }}>{shopAddress}</div>}
          {shopPhone && <div style={{ fontSize: '9px' }}>Tel: {shopPhone}</div>}
        </div>

        {/* Receipt Number & Date */}
        <div style={{ marginBottom: '8px', borderBottom: '1px dashed #000', paddingBottom: '4px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px' }}>
            <span>Receipt: {sale.id.substring(0, 8)}</span>
            <span>{new Date(sale.createdAt).toLocaleDateString()}</span>
          </div>
          <div style={{ fontSize: '10px' }}>
            {new Date(sale.createdAt).toLocaleTimeString()}
          </div>
        </div>

        {/* Items */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '10px', marginBottom: '2px' }}>
            <span>Item</span>
            <span>Qty</span>
            <span>Total</span>
          </div>
          <div style={{ borderBottom: '1px dashed #000', marginBottom: '4px', paddingBottom: '2px' }}>
            {sale.items.map((item, idx) => (
              <div key={idx} style={{ fontSize: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1px' }}>
                  <span style={{ flex: 1 }}>{item.name}</span>
                  <span>{item.qty}</span>
                  <span style={{ textAlign: 'right', width: '30px' }}>
                    ₹{item.subtotal.toFixed(0)}
                  </span>
                </div>
                {item.serialNumber && (
                  <div style={{ fontSize: '9px', color: '#666', marginLeft: '2px' }}>
                    S/N: {item.serialNumber}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div style={{ marginBottom: '8px', borderBottom: '1px dashed #000', paddingBottom: '4px', fontSize: '10px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Subtotal:</span>
            <span>₹{subtotal.toFixed(0)}</span>
          </div>
          {discountAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', color: '#0a7e0f' }}>
              <span>Discount:</span>
              <span>-₹{discountAmount.toFixed(0)}</span>
            </div>
          )}
          {taxAmount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Tax:</span>
              <span>+₹{taxAmount.toFixed(0)}</span>
            </div>
          )}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 'bold',
              fontSize: '12px',
              marginTop: '4px',
            }}
          >
            <span>Total:</span>
            <span>₹{totalDue.toFixed(0)}</span>
          </div>
        </div>

        {/* Payments */}
        {sale.payments.length > 0 && (
          <div style={{ marginBottom: '8px', borderBottom: '1px dashed #000', paddingBottom: '4px', fontSize: '10px' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>PAYMENTS:</div>
            {sale.payments.map((payment, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{payment.method}</span>
                <span>₹{payment.amount.toFixed(0)}</span>
              </div>
            ))}
          </div>
        )}

        {/* QR Code for Portal */}
        {portalLink && (
          <div style={{ textAlign: 'center', marginBottom: '8px', paddingBottom: '4px', borderBottom: '1px dashed #000' }}>
            <div style={{ fontSize: '9px', marginBottom: '4px' }}>Scan for status</div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <QRCode
                value={portalLink}
                size={80}
                level="L"
                includeMargin={false}
                style={{ border: 'none' }}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ textAlign: 'center', fontSize: '9px', marginTop: '4px' }}>
          <div>Thank you for your business!</div>
          <div style={{ marginTop: '2px', color: '#666' }}>
            {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Print Button */}
      <div style={{ marginTop: '16px', textAlign: 'center' }}>
        <button
          onClick={handlePrint}
          style={{
            padding: '8px 16px',
            backgroundColor: '#1E3A8A',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          🖨️ Print Receipt (80mm)
        </button>
      </div>
    </>
  );
};

export default Receipt;
