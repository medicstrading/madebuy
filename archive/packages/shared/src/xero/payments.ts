import { XeroClient, Payments, Payment } from 'xero-node';
import { xeroApiCall } from './client';
import { AccountMappings } from './invoices';

// Apply payment to an invoice
export async function applyPaymentToInvoice(
  xero: XeroClient,
  tenantId: string,
  invoiceId: string,
  amount: number,
  bankAccountCode: string,
  reference?: string
): Promise<string> {
  const payments: Payments = {
    payments: [{
      invoice: { invoiceID: invoiceId },
      account: { code: bankAccountCode },
      date: new Date().toISOString().split('T')[0],
      amount: amount,
      reference: reference || 'Stripe Payment',
      isReconciled: true  // Mark reconciled - from trusted payment source
    }]
  };

  const response = await xeroApiCall(() =>
    xero.accountingApi.createPayments(tenantId, payments)
  );

  return response.body.payments![0].paymentID!;
}

// Record a Stripe payout (batch settlement)
export async function recordPayout(
  xero: XeroClient,
  tenantId: string,
  payout: {
    amount: number;  // Net amount after fees
    reference: string;  // Stripe payout ID
    date: Date;
  },
  mappings: AccountMappings
): Promise<string> {
  // Record as receive money transaction
  const bankTransactions = {
    bankTransactions: [{
      type: 'RECEIVE' as any,
      contact: { name: 'Stripe' },
      bankAccount: { code: mappings.bankAccount },
      lineItems: [{
        description: `Stripe Payout - ${payout.reference}`,
        quantity: 1,
        unitAmount: payout.amount,
        accountCode: mappings.bankAccount,
        taxType: 'NONE',  // Payouts themselves aren't taxable events
        lineAmount: payout.amount
      }],
      date: payout.date.toISOString().split('T')[0],
      reference: payout.reference,
      isReconciled: false  // Will reconcile with bank statement
    }]
  };

  const response = await xeroApiCall(() =>
    xero.accountingApi.createBankTransactions(tenantId, bankTransactions as any)
  );

  return response.body.bankTransactions![0].bankTransactionID!;
}

// Get payment by invoice ID to check if already paid
export async function getPaymentForInvoice(
  xero: XeroClient,
  tenantId: string,
  invoiceId: string
): Promise<Payment | null> {
  try {
    const response = await xeroApiCall(() =>
      xero.accountingApi.getPayments(
        tenantId,
        undefined,
        `Invoice.InvoiceID=guid("${invoiceId}")`
      )
    );

    if (response.body.payments?.length) {
      return response.body.payments[0];
    }
    return null;
  } catch {
    return null;
  }
}

// Void a payment (for refund scenarios)
export async function voidPayment(
  xero: XeroClient,
  tenantId: string,
  paymentId: string
): Promise<void> {
  await xeroApiCall(() =>
    xero.accountingApi.deletePayment(tenantId, paymentId, {
      status: Payment.StatusEnum.DELETED
    } as any)
  );
}
