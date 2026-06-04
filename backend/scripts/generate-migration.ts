import { execSync } from 'child_process';

const now = new Date();
const pad = (n: number) => String(n).padStart(2, '0');
const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
const timestamp = `${date}_${time}`;

const desc = process.argv[2] ?? 'migration';
const name = `${timestamp}_${desc}`;

console.log(`Generating migration: ${name}`);
execSync(`npx drizzle-kit generate --name ${name}`, { stdio: 'inherit' });
