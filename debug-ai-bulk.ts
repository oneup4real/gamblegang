import { generateBulkBets } from "./src/app/actions/ai-bet-actions";

// Mock environment variables since we are running a script outside of Next.js context slightly
// actually, better to use a small script calling the function if possible, but environment variables might be an issue if running via ts-node directly without loading .env.local
// Let's try to just run a quick node script that imports it, assuming we can handle the import.
// Next.js server actions are tricky to run in isolation.
// Instead, I will assume the code structure and maybe try to create a test file I can run with tsx if available, or just analyze the code first.

// Let's just create a script that simulates the call if I can run it.
// Given the environment, I might not be able to easily run 'ts-node' with all next.js aliases working.
