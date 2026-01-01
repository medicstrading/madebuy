import { XeroClient, Invoice, LineItem, Invoices } from 'xero-node';
import { xeroApiCall } from './client';
import type { AccountMappings } from '../types/accountingConnection';

export interface OrderForXero {
  orderId: string;
  buyer: {
    name: string;
    email: string;
  };
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;  // GST-inclusive
  }>;
  shipping: number;
  paidAt: Date;
}

// Re-export for backwards compatibility
export type { AccountMappings } from '../types/accountingConnection';

// Find or create a contact in Xero
async function findOrCreateContact(
  xero: XeroClient,
  tenantId: string,
  buyer: { name: string; email: string }
): Promise<string> {
  // Search for existing contact by email
  const searchResponse = await xeroApiCall(() =>
    xero.accountingApi.getContacts(
      tenantId,
      undefined,
      `EmailAddress=="${buyer.email}"`
    )
  );

  if (searchResponse.body.contacts?.length) {
    return searchResponse.body.contacts[0].contactID!;
  }

  // Create new contact
  const contacts = {
    contacts: [{
      name: buyer.name,
      emailAddress: buyer.email,
      isCustomer: true
    }]
  };

  const createResponse = await xeroApiCall(() =>
    xero.accountingApi.createContacts(tenantId, contacts)
  );

  return createResponse.body.contacts![0].contactID!;
}

// Create an invoice for a marketplace order
export async function createInvoiceFromOrder(
  xero: XeroClient,
  tenantId: string,
  order: OrderForXero,
  mappings: AccountMappings,
  isGstRegistered: boolean = true
): Promise<string> {
  // Get or create contact
  const contactId = await findOrCreateContact(xero, tenantId, order.buyer);

  // Build line items
  const lineItems: LineItem[] = order.items.map(item => ({
    description: item.name,
    quantity: item.quantity,
    unitAmount: item.unitPrice,
    accountCode: mappings.productSales,
    taxType: isGstRegistered ? 'OUTPUT' : 'NONE',
    lineAmount: item.quantity * item.unitPrice
  }));

  // Add shipping if applicable
  if (order.shipping > 0) {
    lineItems.push({
      description: 'Shipping',
      quantity: 1,
      unitAmount: order.shipping,
      accountCode: mappings.shippingIncome,
      taxType: isGstRegistered ? 'OUTPUT' : 'NONE',
      lineAmount: order.shipping
    });
  }

  const invoices: Invoices = {
    invoices: [{
      type: Invoice.TypeEnum.ACCREC,
      contact: { contactID: contactId },
      lineItems,
      date: order.paidAt.toISOString().split('T')[0],
      dueDate: order.paidAt.toISOString().split('T')[0],
      reference: `MadeBuy Order #${order.orderId}`,
      status: Invoice.StatusEnum.AUTHORISED,
      lineAmountTypes: 'Inclusive' as any
    }]
  };

  const response = await xeroApiCall(() =>
    xero.accountingApi.createInvoices(tenantId, invoices)
  );

  return response.body.invoices![0].invoiceID!;
}

// Create a credit note for refunds
export async function createCreditNote(
  xero: XeroClient,
  tenantId: string,
  originalOrder: OrderForXero,
  refundAmount: number,
  reason: string,
  mappings: AccountMappings,
  isGstRegistered: boolean = true
): Promise<string> {
  const contactId = await findOrCreateContact(xero, tenantId, originalOrder.buyer);

  const creditNotes = {
    creditNotes: [{
      type: 'ACCRECCREDIT' as any,
      contact: { contactID: contactId },
      lineItems: [{
        description: `Refund: ${reason}`,
        quantity: 1,
        unitAmount: refundAmount,
        accountCode: mappings.productSales,
        taxType: isGstRegistered ? 'OUTPUT' : 'NONE',
        lineAmount: refundAmount
      }],
      date: new Date().toISOString().split('T')[0],
      reference: `Refund for MadeBuy Order #${originalOrder.orderId}`,
      status: 'AUTHORISED'
    }]
  };

  const response = await xeroApiCall(() =>
    xero.accountingApi.createCreditNotes(tenantId, creditNotes as any)
  );

  return response.body.creditNotes![0].creditNoteID!;
}
