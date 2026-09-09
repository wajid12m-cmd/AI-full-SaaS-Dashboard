// Prisma silently skips any field whose value is `undefined` in a
// `data: {...}` object passed to `.update()` — that's how the original
// controllers supported "only update the fields that were actually sent"
// (e.g. PUT /projects/:id with just { status: "completed" }). Raw SQL has
// no equivalent built in, so every service that does a partial update
// builds its SET clause conditionally and joins the pieces with this
// helper.
//
// Column names are NEVER passed in dynamically here — every caller writes
// its own literal `sql\`"columnName" = ${value}\`` fragments in the
// service file itself. That keeps identifiers as safe, reviewable
// hardcoded strings in the source rather than something built at runtime
// from a variable, so there's no need to worry about identifier-escaping.
import sql from "./db.ts";

// deno-lint-ignore no-explicit-any
export function joinComma(fragments: any[]): any {
  if (fragments.length === 0) {
    throw new Error("joinComma: at least one fragment is required");
  }
  return fragments.reduce((acc, frag) => sql`${acc}, ${frag}`);
}
