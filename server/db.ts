import { Pool } from 'pg'; // Import Pool from 'pg'
import { drizzle } from 'drizzle-orm/node-postgres'; // Import drizzle from 'drizzle-orm/node-postgres'
//import ws from "ws";
import * as schema from "@shared/schema";

//neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });

export async function testDatabaseConnection() {
  console.log("Attempting to connect to database...");
  try {
    // Perform a simple query to test the connection
    await pool.query('SELECT 1+1 AS result');
    console.log("Database connection successful!");
  } catch (error) {
    console.error("CRITICAL DATABASE CONNECTION ERROR:");
    console.error(error);
    // Exit the process so the main server doesn't start with a bad connection
    process.exit(1);
  }
}