# lib/db/

Drizzle ORM schema, queries, and migrations for PostgreSQL.

## Purpose
Defines database schema, provides type-safe query functions, and manages migrations.

## File Structure
```
lib/db/
├── schema.ts              # Entity definitions (users, chats, messages, accounts, etc.)
├── index.ts               # Database connection export
├── *.queries.ts           # CRUD operations by entity
└── migrations/            # Auto-generated Drizzle migrations
```

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
- ❌ Call DB functions in Edge runtime (postgres driver is Node.js only)
