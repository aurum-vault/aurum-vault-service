import { desc } from 'drizzle-orm'
import { db } from '../db/index.js'
import { auditLog } from '../db/schema.js'
import type { AuditEntry } from '../types.js'

export const auditRepository = {
  async insert(
    actor: string,
    action: string,
    entityType: string,
    entityId: string,
    detail: string,
    metadata: Record<string, unknown> = {}
  ): Promise<void> {
    await db.insert(auditLog).values({ actor, action, entity_type: entityType, entity_id: entityId, detail, metadata })
  },

  async findRecent(limit: number): Promise<AuditEntry[]> {
    return db.select().from(auditLog).orderBy(desc(auditLog.created_at)).limit(limit) as Promise<AuditEntry[]>
  },
}
