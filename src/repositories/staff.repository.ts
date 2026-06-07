import { eq, desc } from 'drizzle-orm'
import { db } from '../db/index.js'
import { staff } from '../db/schema.js'
import type { Staff, CreateStaffInput, UpdateStaffInput } from '../types.js'

export const staffRepository = {
  async findById(id: string): Promise<Staff | null> {
    const [row] = await db.select().from(staff).where(eq(staff.id, id))
    return row ?? null
  },

  async findByKeycloakId(keycloakId: string): Promise<Staff | null> {
    const [row] = await db.select().from(staff).where(eq(staff.keycloak_id, keycloakId))
    return row ?? null
  },

  async findAll(): Promise<Omit<Staff, 'keycloak_id'>[]> {
    return db
      .select({
        id: staff.id, full_name: staff.full_name, email: staff.email, mobile: staff.mobile,
        role: staff.role, status: staff.status, last_login: staff.last_login,
        created_at: staff.created_at, updated_at: staff.updated_at,
      })
      .from(staff)
      .orderBy(desc(staff.created_at))
  },

  async create(data: CreateStaffInput): Promise<Staff> {
    const [row] = await db
      .insert(staff)
      .values({ full_name: data.full_name, email: data.email, mobile: data.mobile ?? null, role: data.role, keycloak_id: data.keycloak_id ?? null })
      .returning()
    return row
  },

  async update(id: string, data: UpdateStaffInput): Promise<Staff | null> {
    const [row] = await db
      .update(staff)
      .set({
        full_name:  data.full_name,
        email:      data.email,
        mobile:     data.mobile,
        role:       data.role,
        status:     data.status,
        updated_at: new Date(),
      })
      .where(eq(staff.id, id))
      .returning()
    return row ?? null
  },

  async touchLastLogin(id: string): Promise<void> {
    await db.update(staff).set({ last_login: new Date() }).where(eq(staff.id, id))
  },
}
