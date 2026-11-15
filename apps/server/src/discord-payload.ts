/** Encode Discord webhook payloads without serializing binary attachments as JSON. */
export function discordPayload(data: Record<string, unknown>): { body: BodyInit; headers: Record<string, string> } {
  const files = data.files as Array<{ name: string; content: string | Uint8Array; contentType?: string }> | undefined;
  if (!files?.length) return { body: JSON.stringify(data), headers: { 'content-type': 'application/json' } };
  const { files: _files, ...payload } = data;
  const form = new FormData();
  form.append('payload_json', JSON.stringify({ ...payload, attachments: files.map((file, id) => ({ id, filename: file.name })) }));
  files.forEach((file, id) => form.append(`files[${id}]`, new Blob([typeof file.content === 'string' ? file.content : new Uint8Array(file.content)], { type: file.contentType ?? 'text/plain; charset=utf-8' }), file.name));
  return { body: form, headers: {} };
}
