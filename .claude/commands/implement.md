Implement the following: $ARGUMENTS

## Layer order — never skip or cross

```
src/routes/        ← HTTP only: parse input, call service, send reply
src/services/      ← Business logic, auth checks, audit logging
src/repositories/  ← Drizzle queries only, no business logic
src/db/schema.ts   ← Table definitions (source of truth)
```

## Checklist for a new resource

1. **Schema** (`src/db/schema.ts`) — add table; `.notNull()` on non-nullable columns; `.$type<number>()` on `numeric` columns
2. **Repository** (`src/repositories/<name>.repository.ts`) — Drizzle CRUD; use `getTableColumns(table)` when spreading in joined selects
3. **Service** (`src/services/<name>.service.ts`) — business logic; throw `new AppError(statusCode, message)` for all errors
4. **Route** (`src/routes/<name>.ts`) — thin handler; no SQL or logic
5. **Register** in `src/index.ts`

## Auth

```typescript
app.addHook('preHandler', authenticate)                          // verify JWT
app.addHook('preHandler', requireRole('admin', 'ticket_manager')) // role guard
throw new AppError(403, 'Forbidden')                             // caught by setErrorHandler
```

## Drizzle patterns

```typescript
// SELECT with join
db.select({ ...getTableColumns(table), col: other.col })
  .from(table).innerJoin(other, eq(table.fk, other.id))
  .where(eq(table.col, value)).orderBy(desc(table.created_at))

// INSERT
const [row] = await db.insert(table).values({ ... }).returning()

// UPDATE — undefined fields are skipped automatically
const [row] = await db.update(table)
  .set({ col: newVal, updated_at: new Date() })
  .where(eq(table.id, id)).returning()

// Upsert
db.insert(table).values({ ... })
  .onConflictDoUpdate({ target: table.unique_col, set: { col: sql`excluded.col` } })
  .returning()
```

## After implementing

```bash
npm run build   # must be clean
```