/**
 * MadeBuy Database Migration: Archive Marketplace Collections
 *
 * This script renames collections that are no longer actively used
 * after the pivot from multi-vendor marketplace to inventory management app.
 *
 * Data is preserved (renamed with _archived_ prefix), not deleted.
 *
 * Run with: node scripts/archive-collections.js
 *
 * To rollback: node scripts/archive-collections.js --rollback
 */

const { MongoClient } = require('mongodb');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB = process.env.MONGODB_DB || 'madebuy';

// Collections to archive (rename with _archived_ prefix)
const COLLECTIONS_TO_ARCHIVE = [
  'transactions',
  'payouts',
  'shipments',
  'shipping_profiles',
  'reviews',
  'wishlists',
  'promotions',
  'marketplace_products',
  'analytics',
];

async function archiveCollections(client, db) {
  console.log('🗄️  Archiving collections...\n');

  for (const collection of COLLECTIONS_TO_ARCHIVE) {
    const archivedName = `_archived_${collection}`;

    try {
      // Check if source collection exists
      const collections = await db.listCollections({ name: collection }).toArray();
      if (collections.length === 0) {
        console.log(`   ⏭️  ${collection} - skipped (doesn't exist)`);
        continue;
      }

      // Check if archived version already exists
      const archivedExists = await db.listCollections({ name: archivedName }).toArray();
      if (archivedExists.length > 0) {
        console.log(`   ⚠️  ${collection} - skipped (${archivedName} already exists)`);
        continue;
      }

      // Rename collection
      await db.collection(collection).rename(archivedName);
      const count = await db.collection(archivedName).countDocuments();
      console.log(`   ✅ ${collection} → ${archivedName} (${count} documents)`);

    } catch (error) {
      console.error(`   ❌ ${collection} - error: ${error.message}`);
    }
  }
}

async function rollbackCollections(client, db) {
  console.log('🔄 Rolling back archived collections...\n');

  for (const collection of COLLECTIONS_TO_ARCHIVE) {
    const archivedName = `_archived_${collection}`;

    try {
      // Check if archived collection exists
      const collections = await db.listCollections({ name: archivedName }).toArray();
      if (collections.length === 0) {
        console.log(`   ⏭️  ${archivedName} - skipped (doesn't exist)`);
        continue;
      }

      // Check if original already exists
      const originalExists = await db.listCollections({ name: collection }).toArray();
      if (originalExists.length > 0) {
        console.log(`   ⚠️  ${archivedName} - skipped (${collection} already exists)`);
        continue;
      }

      // Rename back to original
      await db.collection(archivedName).rename(collection);
      const count = await db.collection(collection).countDocuments();
      console.log(`   ✅ ${archivedName} → ${collection} (${count} documents)`);

    } catch (error) {
      console.error(`   ❌ ${archivedName} - error: ${error.message}`);
    }
  }
}

async function main() {
  const isRollback = process.argv.includes('--rollback');

  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║  MadeBuy Database Migration: Archive Collections   ║');
  console.log('╚════════════════════════════════════════════════════╝\n');
  console.log(`Mode: ${isRollback ? 'ROLLBACK' : 'ARCHIVE'}`);
  console.log(`Database: ${MONGODB_DB}`);
  console.log(`URI: ${MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}\n`);

  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(MONGODB_DB);

    if (isRollback) {
      await rollbackCollections(client, db);
    } else {
      await archiveCollections(client, db);
    }

    console.log('\n✅ Migration complete!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
