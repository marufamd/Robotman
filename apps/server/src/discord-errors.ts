/** Describe Discord failures without logging webhook URLs, credentials, or payloads. */
export async function discordFailure(response: Response, secrets: Array<string | undefined> = []): Promise<string> {
  let detail = '';
  try {
    const body: unknown = await response.json();
    if (body && typeof body === 'object') {
      const { code, message } = body as { code?: unknown; message?: unknown };
      const errorCode = typeof code === 'number' ? `Discord ${code}` : '';
      let errorMessage = typeof message === 'string' ? message : '';
      for (const secret of secrets) if (secret) errorMessage = errorMessage.replaceAll(secret, '<REDACTED>');
      errorMessage = errorMessage.replace(/\/webhooks\/[^/\s]+\/[^/\s?]+/g, '/webhooks/<REDACTED>/<REDACTED>').replace(/[\r\n]/g, ' ').slice(0, 240);
      detail = [errorCode, errorMessage].filter(Boolean).join(': ');
    }
  } catch { /* An empty or non-JSON error must still report the HTTP status. */ }
  return `HTTP ${response.status}${detail ? `; ${detail}` : ''}`;
}
