type OffsetCursorPayload = {
  v: 1
  o: number
}

const isValidOffset = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value) && value >= 0

export const encodeOffsetCursor = (offset: number): string | null => {
  if (!isValidOffset(offset)) {
    return null
  }

  const payload: OffsetCursorPayload = { v: 1, o: offset }
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url")
}

export const decodeOffsetCursor = (cursor: string | null): number => {
  if (!cursor) return 0

  try {
    const payload = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as Partial<OffsetCursorPayload>
    if (payload.v === 1 && isValidOffset(payload.o)) {
      return payload.o
    }
  } catch {
    // Ignore malformed cursor and fall back to first page.
  }

  return 0
}
