import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Get database connection string from environment variable
const connectionString = process.env.DATABASE_URL;

// Throw an error if the connection string is not provided
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is not set');
}

// Create a postgres connection with a reasonable timeout
// This helps prevent hanging during builds
const client = postgres(connectionString, {
  idle_timeout: 20,       // Max idle time in seconds
  connect_timeout: 10,    // Connection timeout in seconds
  max_lifetime: 60 * 5,   // Connection max lifetime in seconds
  max: 10,                // Maximum number of connections
});

// Create a drizzle database instance
export const db = drizzle(client, { schema });

// Export the schema for use in queries
export * from './schema';

// Export the raw client for direct queries
export { client };