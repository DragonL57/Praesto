import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Get database connection string from environment variable
const connectionString = process.env.DATABASE_URL;

// Throw an error if the connection string is not provided
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create a postgres connection
const client = postgres(connectionString);

// Create a drizzle database instance
export const db = drizzle(client, { schema });

// Export the schema for use in queries
export * from './schema';