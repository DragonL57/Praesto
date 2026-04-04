# lib/db/

Drizzle ORM schema, queries, and migrations for PostgreSQL.

## Files
- schema.ts: Entity definitions
- {entity}.queries.ts: CRUD operations
- migrations/: Auto-generated migrations

## Conventions
```typescript
// schema.ts
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull(),
  // ...
});

// queries.ts
export async function getUserById(db: PostgresJsDatabase, id: string) {
  return db.query.users.findFirst({
    where: (users, { eq }) => eq(users.id, id),
  });
}
```

## Commands
```bash
pnpm db:generate  # Create migration
pnpm db:migrate   # Run migrations
pnpm db:push      # Push schema changes
pnpm db:studio    # Open Drizzle Studio
```

## Anti-Patterns
- ❌ Hardcode queries (use query builder)
- ❌ Skip types on results
- ❌ Manual migrations