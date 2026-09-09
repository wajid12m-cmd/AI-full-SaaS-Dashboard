// The original utils/hash.js used `bcrypt`, which relies on a compiled
// native addon — that can't run inside a Deno Edge Function (no native
// binary execution). `bcryptjs` is a pure-JavaScript reimplementation with
// the same hash format and (nearly) the same API, so existing password
// hashes in the database keep working unchanged after this switch.
import bcrypt from "npm:bcryptjs@2.4.3";

const SALT_ROUNDS = 10;

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}
