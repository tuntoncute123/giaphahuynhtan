// Audio players (especially Safari) seek with single byte-range requests.
export function fileResponse(
  bytes: Uint8Array,
  contentType: string,
  request: Request,
): Response {
  const headers = new Headers({
    "Content-Type": contentType,
    "Content-Length": String(bytes.length),
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
    "Accept-Ranges": "bytes",
  });
  const range = request.headers.get("range");
  if (!range) return new Response(new Uint8Array(bytes), { headers });
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);
  const invalid = () => {
    headers.set("Content-Range", `bytes */${bytes.length}`);
    headers.set("Content-Length", "0");
    return new Response(null, { status: 416, headers });
  };
  if (!match || (!match[1] && !match[2])) return invalid();
  const start = match[1]
    ? Number(match[1])
    : Math.max(0, bytes.length - Number(match[2]));
  const end = match[1]
    ? match[2]
      ? Math.min(Number(match[2]), bytes.length - 1)
      : bytes.length - 1
    : bytes.length - 1;
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start >= bytes.length ||
    start > end
  )
    return invalid();
  headers.set("Content-Range", `bytes ${start}-${end}/${bytes.length}`);
  headers.set("Content-Length", String(end - start + 1));
  return new Response(new Uint8Array(bytes.slice(start, end + 1)), {
    status: 206,
    headers,
  });
}
