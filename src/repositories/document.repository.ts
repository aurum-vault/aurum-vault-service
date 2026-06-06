import { eq, desc, getTableColumns } from 'drizzle-orm'
import { db } from '../db/index.js'
import { documents, assets } from '../db/schema.js'
import type { Document } from '../types.js'

type DocumentWithAsset = Document & { asset_name: string; asset_ref: string }

const WITH_ASSET = { ...getTableColumns(documents), asset_name: assets.name, asset_ref: assets.asset_ref }

export const documentRepository = {
  async findByCustomerId(customerId: string): Promise<DocumentWithAsset[]> {
    return db
      .select(WITH_ASSET)
      .from(documents)
      .innerJoin(assets, eq(documents.asset_id, assets.id))
      .where(eq(documents.customer_id, customerId))
      .orderBy(desc(documents.created_at))
  },

  async findAll(): Promise<DocumentWithAsset[]> {
    return db
      .select(WITH_ASSET)
      .from(documents)
      .innerJoin(assets, eq(documents.asset_id, assets.id))
      .orderBy(desc(documents.created_at))
  },

  async findById(id: string): Promise<Document | null> {
    const [row] = await db.select().from(documents).where(eq(documents.id, id))
    return row ?? null
  },

  async create(customerId: string, assetId: string, type: string, filename: string, storagePath: string): Promise<Document> {
    const [row] = await db
      .insert(documents)
      .values({ asset_id: assetId, customer_id: customerId, type, filename, storage_path: storagePath })
      .returning()
    return row
  },

  async updateStatus(id: string, status: string): Promise<Document | null> {
    const [row] = await db
      .update(documents)
      .set({ status, updated_at: new Date() })
      .where(eq(documents.id, id))
      .returning()
    return row ?? null
  },
}
