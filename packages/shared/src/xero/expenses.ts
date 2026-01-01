import { XeroClient, BankTransactions } from 'xero-node';
import { xeroApiCall } from './client';
import { AccountMappings } from './invoices';

export interface FeeExpense {
  orderId: string;
  type: 'stripe' | 'platform';
  amount: number;
  description: string;
}

// Get or create MadeBuy/Stripe as supplier contact
async function getSupplierContact(
  xero: XeroClient,
  tenantId: string,
  supplierName: string
): Promise<string> {
  // Search for existing supplier
  const searchResponse = await xeroApiCall(() =>
    xero.accountingApi.getContacts(
      tenantId,
      undefined,
      `Name=="${supplierName}"`
    )
  );

  if (searchResponse.body.contacts?.length) {
    return searchResponse.body.contacts[0].contactID!;
  }

  // Create supplier contact
  const contacts = {
    contacts: [{
      name: supplierName,
      isSupplier: true
    }]
  };

  const createResponse = await xeroApiCall(() =>
    xero.accountingApi.createContacts(tenantId, contacts)
  );

  return createResponse.body.contacts![0].contactID!;
}

// Get bank account ID from account code
async function getBankAccountId(
  xero: XeroClient,
  tenantId: string,
  accountCode: string
): Promise<string> {
  const response = await xeroApiCall(() =>
    xero.accountingApi.getAccounts(
      tenantId,
      undefined,
      `Code=="${accountCode}" AND Type=="BANK"`
    )
  );

  if (!response.body.accounts?.length) {
    throw new Error(`Bank account with code ${accountCode} not found`);
  }

  return response.body.accounts[0].accountID!;
}

// Record a fee expense (Stripe fee, platform fee)
export async function recordFeeExpense(
  xero: XeroClient,
  tenantId: string,
  expense: FeeExpense,
  mappings: AccountMappings,
  isGstRegistered: boolean = true
): Promise<string> {
  const supplierName = expense.type === 'stripe' ? 'Stripe' : 'MadeBuy Platform';
  const supplierId = await getSupplierContact(xero, tenantId, supplierName);
  const bankAccountId = await getBankAccountId(xero, tenantId, mappings.bankAccount);

  const accountCode = expense.type === 'stripe'
    ? mappings.paymentFees
    : mappings.platformFees;

  const bankTransactions: BankTransactions = {
    bankTransactions: [{
      type: 'SPEND' as any,
      contact: { contactID: supplierId },
      bankAccount: { accountID: bankAccountId },
      lineItems: [{
        description: expense.description,
        quantity: 1,
        unitAmount: expense.amount,
        accountCode: accountCode,
        // INPUT tax means GST on expenses is claimable
        taxType: isGstRegistered ? 'INPUT' : 'NONE',
        lineAmount: expense.amount
      }],
      date: new Date().toISOString().split('T')[0],
      reference: `${expense.type.toUpperCase()}-${expense.orderId}`,
      isReconciled: false
    }]
  };

  const response = await xeroApiCall(() =>
    xero.accountingApi.createBankTransactions(tenantId, bankTransactions)
  );

  return response.body.bankTransactions![0].bankTransactionID!;
}

// Record multiple fees for an order
export async function recordOrderFees(
  xero: XeroClient,
  tenantId: string,
  orderId: string,
  fees: { stripe: number; platform: number },
  mappings: AccountMappings,
  isGstRegistered: boolean = true
): Promise<{ stripeExpenseId?: string; platformExpenseId?: string }> {
  const result: { stripeExpenseId?: string; platformExpenseId?: string } = {};

  if (fees.stripe > 0) {
    result.stripeExpenseId = await recordFeeExpense(xero, tenantId, {
      orderId,
      type: 'stripe',
      amount: fees.stripe,
      description: `Stripe Payment Fee - Order #${orderId}`
    }, mappings, isGstRegistered);
  }

  if (fees.platform > 0) {
    result.platformExpenseId = await recordFeeExpense(xero, tenantId, {
      orderId,
      type: 'platform',
      amount: fees.platform,
      description: `MadeBuy Platform Fee - Order #${orderId}`
    }, mappings, isGstRegistered);
  }

  return result;
}
