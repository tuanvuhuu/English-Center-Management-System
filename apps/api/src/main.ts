import { openDb } from './db.js';
import { buildApp } from './app.js';
import { seedIfEmpty } from './seed.js';

const db = openDb();
seedIfEmpty(db);
const app = buildApp(db);
const port = Number(process.env.PORT ?? 3001);
app.listen({ port, host: '0.0.0.0' }).then(() => console.log(`ECMS API: http://localhost:${port}`));
