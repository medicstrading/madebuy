import { nanoid } from 'nanoid';
import { getDatabase } from '../client';
import type { Payout, CreatePayoutInput, PayoutStatus } from '@madebuy/shared';

const COLLECTION = 'payouts';

export async function createPayout(
  tenantId: string,
  input: CreatePayoutInput
): Promise<Payout> {
  const db = await getDatabase();

  const payout: Payout = {
    id: nanoid(),
    tenantId,
    stripePayoutId: input.stripePayoutId,
    amount: input.amount,
    currency: input.currency || 'AUD',
    status: input.status,
    destinationLast4: input.destinationLast4,
    destinationBankName: input.destinationBankName,
    arrivalDate: input.arrivalDate || new Date(),
    initiatedAt: input.initiatedAt,
    transactionIds: input.transactionIds || [],
    method: input.method,
    description: input.description,
    statementDescriptor: input.statementDescriptor,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.collection(COLLECTION).insertOne(payout);
  return payout;
}

export async function getPayoutById(id: string): Promise<Payout | null> {
  const db = await getDatabase();
  return (await db.collection(COLLECTION).findOne({ id })) as Payout | null;
}

export async function getPayoutByStripeId(stripePayoutId: string): Promise<Payout | null> {
  const db = await getDatabase();
  return (await db
    .collection(COLLECTION)
    .findOne({ stripePayoutId })) as Payout | null;
}

export async function listPayoutsByTenant(
  tenantId: string,
  options?: {
    limit?: number;
    offset?: number;
    status?: PayoutStatus;
    startDate?: Date;
    endDate?: Date;
  }
): Promise<Payout[]> {
  const db = await getDatabase();

  const filter: Record<string, unknown> = { tenantId };

  if (options?.status) {
    filter.status = options.status;
  }

  if (options?.startDate || options?.endDate) {
    filter.createdAt = {};
    if (options.startDate) {
      (filter.createdAt as Record<string, unknown>).$gte = options.startDate;
    }
    if (options.endDate) {
      (filter.createdAt as Record<string, unknown>).$lte = options.endDate;
    }
  }

  const cursor = db
    .collection(COLLECTION)
    .find(filter)
    .sort({ createdAt: -1 });

  if (options?.offset) {
    cursor.skip(options.offset);
  }

  if (options?.limit) {
    cursor.limit(options.limit);
  }

  return (await cursor.toArray()) as unknown as Payout[];
}

export async function updatePayoutStatus(
  stripePayoutId: string,
  status: PayoutStatus,
  updates?: Partial<
    Pick<Payout, 'arrivalDate' | 'failureCode' | 'failureMessage'>
  >
): Promise<void> {
  const db = await getDatabase();
  await db.collection(COLLECTION).updateOne(
    { stripePayoutId },
    {
      $set: {
        status,
        ...updates,
        updatedAt: new Date(),
      },
    }
  );
}

export async function addTransactionToPayout(
  payoutId: string,
  transactionId: string
): Promise<void> {
  const db = await getDatabase();
  await db.collection(COLLECTION).updateOne(
    { id: payoutId },
    {
      $addToSet: { transactionIds: transactionId },
      $set: { updatedAt: new Date() },
    }
  );
}

export async function getPayoutSummary(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalPaid: number;
  totalPending: number;
  payoutCount: number;
}> {
  const db = await getDatabase();

  const result = await db
    .collection(COLLECTION)
    .aggregate([
      {
        $match: {
          tenantId,
          createdAt: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$status',
          total: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ])
    .toArray();

  let totalPaid = 0;
  let totalPending = 0;
  let payoutCount = 0;

  for (const item of result) {
    payoutCount += item.count;
    if (item._id === 'paid') {
      totalPaid = item.total;
    } else if (item._id === 'pending' || item._id === 'in_transit') {
      totalPending += item.total;
    }
  }

  return { totalPaid, totalPending, payoutCount };
}

/**
 * Get pending payout summary for dashboard
 * CRITICAL: Always filter by tenantId for security
 */
export async function getPendingPayoutSummary(
  tenantId: string
): Promise<{
  pendingAmount: number;
  nextPayoutDate: Date | null;
  inTransitAmount: number;
}> {
  const db = await getDatabase();

  const [pendingResult, inTransitResult, nextPayout] = await Promise.all([
    // Sum of pending payouts
    db
      .collection(COLLECTION)
      .aggregate([
        { $match: { tenantId, status: 'pending' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ])
      .toArray(),

    // Sum of in-transit payouts
    db
      .collection(COLLECTION)
      .aggregate([
        { $match: { tenantId, status: 'in_transit' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ])
      .toArray(),

    // Next scheduled payout (earliest pending with arrival date)
    db.collection(COLLECTION).findOne(
      { tenantId, status: 'pending' },
      { sort: { arrivalDate: 1 } }
    ),
  ]);

  return {
    pendingAmount: pendingResult[0]?.total || 0,
    inTransitAmount: inTransitResult[0]?.total || 0,
    nextPayoutDate: (nextPayout as Payout | null)?.arrivalDate || null,
  };
}

/**
 * Get payout statistics for analytics
 * CRITICAL: Always filter by tenantId for security
 */
export async function getPayoutStats(
  tenantId: string,
  startDate: Date,
  endDate: Date
): Promise<{
  totalPaid: number;
  payoutCount: number;
  averagePayoutAmount: number;
  failedCount: number;
}> {
  const db = await getDatabase();

  const [paidResult, failedResult] = await Promise.all([
    // Stats for paid payouts
    db
      .collection(COLLECTION)
      .aggregate([
        {
          $match: {
            tenantId,
            status: 'paid',
            createdAt: { $gte: startDate, $lte: endDate },
          },
        },
        {
          $group: {
            _id: null,
            totalPaid: { $sum: '$amount' },
            payoutCount: { $sum: 1 },
          },
        },
      ])
      .toArray(),

    // Count of failed payouts
    db.collection(COLLECTION).countDocuments({
      tenantId,
      status: 'failed',
      createdAt: { $gte: startDate, $lte: endDate },
    }),
  ]);

  const totalPaid = paidResult[0]?.totalPaid || 0;
  const payoutCount = paidResult[0]?.payoutCount || 0;

  return {
    totalPaid,
    payoutCount,
    averagePayoutAmount:
      payoutCount > 0 ? Math.round(totalPaid / payoutCount) : 0,
    failedCount: failedResult,
  };
}

/**
 * List payouts with pagination and total count
 * CRITICAL: Always filter by tenantId for security
 */
export async function listPayouts(
  tenantId: string,
  options?: {
    status?: PayoutStatus;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }
): Promise<{ payouts: Payout[]; total: number }> {
  const db = await getDatabase();

  const filter: Record<string, unknown> = { tenantId };

  if (options?.status) {
    filter.status = options.status;
  }

  if (options?.startDate || options?.endDate) {
    filter.createdAt = {};
    if (options.startDate) {
      (filter.createdAt as Record<string, unknown>).$gte = options.startDate;
    }
    if (options.endDate) {
      (filter.createdAt as Record<string, unknown>).$lte = options.endDate;
    }
  }

  const limit = options?.limit || 50;
  const offset = options?.offset || 0;

  const [payouts, total] = await Promise.all([
    db
      .collection(COLLECTION)
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .toArray(),
    db.collection(COLLECTION).countDocuments(filter),
  ]);

  return { payouts: payouts as unknown as Payout[], total };
}

/**
 * Delete payout (for testing/cleanup only)
 * CRITICAL: Always filter by tenantId for security
 */
export async function deletePayout(
  tenantId: string,
  payoutId: string
): Promise<void> {
  const db = await getDatabase();
  await db.collection(COLLECTION).deleteOne({ tenantId, id: payoutId });
}

/**
 * Count payouts for a tenant
 */
export async function countPayouts(tenantId: string): Promise<number> {
  const db = await getDatabase();
  return await db.collection(COLLECTION).countDocuments({ tenantId });
}

/**
 * Create indexes for the payouts collection
 * Called during database initialization
 */
export async function createIndexes(): Promise<void> {
  const db = await getDatabase();
  const col = db.collection(COLLECTION);

  await col.createIndex({ tenantId: 1, createdAt: -1 });
  await col.createIndex({ tenantId: 1, status: 1 });
  await col.createIndex({ stripePayoutId: 1 }, { unique: true });
  await col.createIndex({ tenantId: 1, arrivalDate: -1 });
}
