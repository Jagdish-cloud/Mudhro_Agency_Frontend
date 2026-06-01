const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Opaque URL segment for entity ids. UUIDs are already opaque; pass through.
 * The API also accepts Hashids / base64url via decodeId on the server.
 */
export function encodeId(value: string): string {
  if (UUID_REGEX.test(value)) return value;
  return value;
}

export function decodeId(value: string): string {
  const t = value.trim();
  if (UUID_REGEX.test(t)) return t.toLowerCase();
  return t;
}
