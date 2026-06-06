import { eq, desc, getTableColumns } from 'drizzle-orm'
import { db } from '../db/index.js'
import { assets, customers } from '../db/schema.js'
import type { Asset, CreateAssetInput, UpdateAssetInput } from '../types.js'

type AssetWithCustomer = Asset & { customer_name: string }

export const assetRepository = {
  async findById(id: string): Promise<Asset | null> {
    const [row] = await db.select().from(assets).where(eq(assets.id, id))
    return row ?? null
  },

  async findByCustomerId(customerId: string): Promise<Asset[]> {
    return db.select().from(assets).where(eq(assets.customer_id, customerId)).orderBy(desc(assets.created_at))
  },

  async findAllWithCustomer(): Promise<AssetWithCustomer[]> {
    return db
      .select({ ...getTableColumns(assets), customer_name: customers.full_name })
      .from(assets)
      .innerJoin(customers, eq(assets.customer_id, customers.id))
      .orderBy(desc(assets.created_at))
  },

  async create(customerId: string, data: CreateAssetInput): Promise<Asset> {
    const [row] = await db
      .insert(assets)
      .values({
        customer_id:    customerId,
        name:           data.name,
        category:       data.category,
        perspective:    data.perspective ?? 'customer',
        metal:          data.metal,
        purity:         data.purity,
        huid:           data.huid ?? null,
        gross:          data.gross,
        deduction:      data.deduction ?? 0,
        net:            data.net,
        purchase_price: data.purchase_price ?? 0,
        purchase_date:  data.purchase_date ?? null,
        purchased_from: data.purchased_from ?? null,
        invoice_ref:    data.invoice_ref ?? null,
        provenance:     data.provenance ?? null,
        occasion:       data.occasion ?? null,
        gifted_by:      data.gifted_by ?? null,
        location_type:  data.location_type ?? null,
        location_detail: data.location_detail ?? {},
        images:         data.images ?? [],
      })
      .returning()
    return row
  },

  async update(id: string, data: UpdateAssetInput): Promise<Asset | null> {
    const [row] = await db
      .update(assets)
      .set({
        name:            data.name,
        category:        data.category,
        perspective:     data.perspective,
        metal:           data.metal,
        purity:          data.purity,
        huid:            data.huid,
        gross:           data.gross,
        deduction:       data.deduction,
        net:             data.net,
        purchase_price:  data.purchase_price,
        purchase_date:   data.purchase_date,
        purchased_from:  data.purchased_from,
        invoice_ref:     data.invoice_ref,
        provenance:      data.provenance,
        occasion:        data.occasion,
        gifted_by:       data.gifted_by,
        location_type:   data.location_type,
        location_detail: data.location_detail,
        images:          data.images,
        status:          data.status,
        appraised_value: data.appraised_value,
        updated_at:      new Date(),
      })
      .where(eq(assets.id, id))
      .returning()
    return row ?? null
  },

  async updateAppraisedValue(id: string, value: number): Promise<void> {
    await db
      .update(assets)
      .set({ appraised_value: value, status: 'verified', last_verified: new Date(), updated_at: new Date() })
      .where(eq(assets.id, id))
  },

  async delete(id: string): Promise<void> {
    await db.delete(assets).where(eq(assets.id, id))
  },
}
