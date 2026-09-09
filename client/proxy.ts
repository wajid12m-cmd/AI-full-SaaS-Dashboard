import { NextRequest, NextResponse } from "next/server";

// Auth check ab sirf client-side (dashboard/layout.tsx ka refreshUser())
// karta hai — accessToken cookie backend (Supabase) ke domain par set
// hoti hai, isliye ye frontend server kabhi nahi dekh sakta.
export function proxy(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [],
};