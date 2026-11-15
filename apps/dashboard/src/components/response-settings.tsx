import { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Icon } from './icon';
import { useAuth } from '../lib/auth-context';
import { queryGraphql, type ManagedServer, type ResponseSettings } from '../lib/graphql';
import { InlineAlert, PageHeader, fieldClass, primaryButtonClass } from './server-page';
import { VariableGuide, messageVariables } from './variables';

export function ResponseSettingsEditor({ server, csrfToken }: { server: ManagedServer; csrfToken: string }) {
  const { user, needsSignIn } = useAuth();
  const [settings, setSettings] = useState<ResponseSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const draftKey = `robotman:response-settings:${user?.id}:${server.id}`;
  async function load() {
    setError(null);
    try {
      const result = await queryGraphql<{ responseSettings: ResponseSettings }>('query($server: ID!) { responseSettings(guildId: $server) { introduction } }', undefined, { server: server.id });
      let restored: ResponseSettings | null = null;
      try {
        const value = JSON.parse(sessionStorage.getItem(draftKey) ?? 'null');
        if (value && typeof value.introduction === 'string') restored = value;
      } catch { /* A missing or unreadable local draft does not block server settings. */ }
      setSettings(restored ?? result.responseSettings);
      if (restored) setNotice('Your settings draft was restored. Review it before saving.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load Response settings.'); }
  }
  useEffect(() => { void load(); }, [server.id, draftKey]);
  useEffect(() => {
    const preserve = (event: Event) => {
      if (!settings) return;
      try { sessionStorage.setItem(draftKey, JSON.stringify(settings)); }
      catch { event.preventDefault(); setError('Your settings could not be kept for sign-in. Copy your changes before continuing.'); }
    };
    window.addEventListener('robotman:before-sign-in', preserve);
    return () => window.removeEventListener('robotman:before-sign-in', preserve);
  }, [settings, draftKey]);
  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!settings || needsSignIn || saving) return;
    setSaving(true); setError(null); setNotice(null);
    try {
      await queryGraphql('mutation($server: ID!, $input: ResponseSettingsInput!) { updateResponseSettings(guildId: $server, input: $input) { introduction } }', csrfToken, { server: server.id, input: { introduction: settings.introduction } });
      try { sessionStorage.removeItem(draftKey); } catch { /* Settings are saved server-side. */ }
      setNotice('Response settings saved.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save Response settings.'); }
    finally { setSaving(false); }
  }
  return <section className="response-editor max-w-3xl">
    <PageHeader compact title="Response Settings" description="Set the introduction shown before Responses. Each Response can use it, replace it, or omit it." server={server} />
    <Link className="mb-5 inline-flex items-center gap-2 rounded text-sm font-semibold text-sunset-200 underline-offset-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-sunset-400" to="/servers/$serverId/responses" params={{ serverId: server.id }}><Icon className="size-4 rotate-180" name="arrow" /><span>All Responses</span></Link>
    {error && <div className="mb-5"><InlineAlert>{error}{!settings && <button className="ml-2 underline" onClick={() => void load()}>Try again</button>}</InlineAlert></div>}
    {notice && <div className="mb-5"><InlineAlert tone="success">{notice}</InlineAlert></div>}
    {!settings ? !error && <p role="status" className="text-sm text-night-300">Loading Response settings…</p> : <form className="space-y-5" onSubmit={event => void save(event)}>
      <section className="rounded-xl border border-night-800 bg-night-900/60 p-4" aria-labelledby="response-default-introduction">
        <h2 id="response-default-introduction" className="font-display text-base font-bold text-white">Default introduction</h2>
        <p className="mt-1 text-sm leading-6 text-night-300">Shown above a Response’s text. Leave it empty to show nothing. New Responses use it unless they choose their own.</p>
        <label className="mt-4 block text-sm text-night-100">Default introduction<textarea className={fieldClass} rows={4} maxLength={2000} value={settings.introduction} onChange={event => setSettings({ introduction: event.target.value })} /></label>
        <VariableGuide label="Variables for introductions" variables={messageVariables} />
      </section>
      <p className="text-sm leading-6 text-night-300">Changes publish when saved. If a new introduction makes an existing Response exceed Discord’s limits, the save is blocked and names the Response to fix.</p>
      <div className="flex flex-wrap items-center gap-3"><button className={primaryButtonClass} disabled={needsSignIn || saving} type="submit">{saving ? 'Saving…' : 'Save settings'}</button><Link className="rounded px-3 py-2 text-sm text-night-300 underline-offset-4 hover:underline" onClick={() => { try { sessionStorage.removeItem(draftKey); } catch { /* Discard remains available. */ } }} to="/servers/$serverId/responses" params={{ serverId: server.id }}>Cancel</Link></div>
    </form>}
  </section>;
}
