import "dotenv/config";
import { openDB, ensureSchema } from "./db";

const DB_PATH = process.env.DATABASE_PATH || "./data/app.db";
const db = openDB(DB_PATH);
ensureSchema(db);
console.log("Schema ensured at", DB_PATH);