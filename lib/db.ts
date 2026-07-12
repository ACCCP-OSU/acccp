import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./db/schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("Missing env var: DATABASE_URL");

const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
