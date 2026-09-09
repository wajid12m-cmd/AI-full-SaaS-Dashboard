// Small shared helper for pulling a human-readable message out of a failed
// API call. Centralizing this in one typed function means none of the
// pages need `catch (err: any)` anymore (which ESLint's
// @typescript-eslint/no-explicit-any rule correctly flags — `any` disables
// type-checking for everything it touches, not just the error itself).
export function getErrorMessage(err: unknown, fallback: string): string {
  if (
    typeof err === "object" &&
    err !== null &&
    "response" in err &&
    typeof (err as { response?: unknown }).response === "object"
  ) {
    const response = (err as { response?: { data?: { message?: string } } })
      .response;
    if (response?.data?.message) {
      return response.data.message;
    }
  }
  return fallback;
}

export function getErrorStatus(err: unknown): number | undefined {
  if (
    typeof err === "object" &&
    err !== null &&
    "response" in err &&
    typeof (err as { response?: unknown }).response === "object"
  ) {
    return (err as { response?: { status?: number } }).response?.status;
  }
  return undefined;
}
