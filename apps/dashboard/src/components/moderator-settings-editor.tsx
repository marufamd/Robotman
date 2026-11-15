import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { queryGraphql } from '../lib/graphql';
import type { ManagedServer, ModeratorSettings } from '../lib/graphql';
import { LoadingSpinner } from './icon';
import { InlineAlert, PageHeader, fieldClass, primaryButtonClass } from './server-page';

export function ModeratorSettingsEditor({ server, csrfToken }: { server: ManagedServer; csrfToken: string }) {
  const [settings, setSettings] = useState<ModeratorSettings | null>(null);
  const [channelId, setChannelId] = useState('');
  const [weekday, setWeekday] = useState('0');
  const [time, setTime] = useState('00:00');
  const [timeZone, setTimeZone] = useState('UTC');
  const [showIds, setShowIds] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    setError(null);
    setSettings(null);
    try {
      const data = await queryGraphql<{ moderatorSettings: ModeratorSettings }>(
        'query ModeratorSettings($server: ID!) { moderatorSettings(guildId: $server) { guildId releaseListChannelId releaseListDayOfWeek releaseListHour releaseListMinute releaseListTimeZone tvmazeShowIds } }',
        undefined,
        { server: server.id },
      );
      const value = data.moderatorSettings;
      setSettings(value);
      setChannelId(value.releaseListChannelId ?? '');
      setWeekday(String(value.releaseListDayOfWeek));
      setTime(`${String(value.releaseListHour).padStart(2, '0')}:${String(value.releaseListMinute).padStart(2, '0')}`);
      setTimeZone(value.releaseListTimeZone);
      setShowIds(value.tvmazeShowIds.join(', '));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not load settings for this server.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { setLoading(true); void load(); }, [server.id]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const [hourText, minuteText] = time.split(':');
    const ids = showIds.split(',').map(value => Number(value.trim())).filter(Number.isFinite).filter(value => value > 0);
    setSaving(true); setError(null); setNotice(null);
    try {
      const result = await queryGraphql<{ updateModeratorSettings: ModeratorSettings }>(
        'mutation SaveModeratorSettings($server: ID!, $input: ModeratorSettingsInput!) { updateModeratorSettings(guildId: $server, input: $input) { guildId releaseListChannelId releaseListDayOfWeek releaseListHour releaseListMinute releaseListTimeZone tvmazeShowIds } }',
        csrfToken,
        { server: server.id, input: {
          releaseListChannelId: channelId.trim() || null,
          releaseListDayOfWeek: Number(weekday),
          releaseListHour: Number(hourText),
          releaseListMinute: Number(minuteText),
          releaseListTimeZone: timeZone.trim(),
          tvmazeShowIds: ids,
        } },
      );
      const value = result.updateModeratorSettings;
      setSettings(value);
      setChannelId(value.releaseListChannelId ?? '');
      setWeekday(String(value.releaseListDayOfWeek));
      setTime(`${String(value.releaseListHour).padStart(2, '0')}:${String(value.releaseListMinute).padStart(2, '0')}`);
      setTimeZone(value.releaseListTimeZone);
      setShowIds(value.tvmazeShowIds.join(', '));
      setNotice('Server settings saved.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Could not save server settings.'); }
    finally { setSaving(false); }
  }

  return <section>
    <PageHeader description="Set the weekly Release List delivery and the TVmaze shows used by /shows." server={server} title="Server Settings" />
    {error && <div className="mb-5"><InlineAlert>{error} <button className="ml-2 font-semibold text-white underline underline-offset-4" onClick={() => { setLoading(true); void load(); }}>Try again</button></InlineAlert></div>}
    {notice && <div className="mb-5"><InlineAlert tone="success">{notice}</InlineAlert></div>}
    {loading ? <div aria-label="Loading server settings" className="h-72 animate-pulse rounded-xl bg-night-800/70" role="status" /> : settings && <form className="max-w-4xl" onSubmit={event => void save(event)}>
      <fieldset className="rounded-xl border border-night-800 bg-night-900/50 p-5 sm:p-6"><legend className="px-2 font-display text-lg font-bold text-white">Weekly Release List</legend><p className="mb-5 text-sm leading-6 text-night-300">Choose when the Release List is posted. Scheduled posting stays off until you choose a destination channel.</p>
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block text-sm font-medium text-night-100">Destination channel ID<input className={fieldClass} name="releaseListChannelId" onChange={event => setChannelId(event.target.value)} placeholder="Leave blank to disable scheduled posting" value={channelId} /><span className="mt-1 block text-xs leading-5 text-night-400">Paste the Discord channel ID. Manual and scheduled Release Lists use this channel.</span></label>
          <label className="block text-sm font-medium text-night-100">Posting time<input className={fieldClass} name="releaseListTime" onChange={event => setTime(event.target.value)} required type="time" value={time} /></label>
          <label className="block text-sm font-medium text-night-100">Weekday<select className={fieldClass} name="releaseListDayOfWeek" onChange={event => setWeekday(event.target.value)} value={weekday}><option value="0">Sunday</option><option value="1">Monday</option><option value="2">Tuesday</option><option value="3">Wednesday</option><option value="4">Thursday</option><option value="5">Friday</option><option value="6">Saturday</option></select></label>
          <label className="block text-sm font-medium text-night-100">Time zone<input className={fieldClass} name="releaseListTimeZone" onChange={event => setTimeZone(event.target.value)} placeholder="America/Toronto" required value={timeZone} /><span className="mt-1 block text-xs leading-5 text-night-400">Use an IANA time zone such as America/Toronto or UTC.</span></label>
        </div>
      </fieldset>
      <fieldset className="mt-5 rounded-xl border border-night-800 bg-night-900/50 p-5 sm:p-6"><legend className="px-2 font-display text-lg font-bold text-white">Shows for /shows</legend><p className="mb-4 text-sm leading-6 text-night-300">TVmaze show IDs determine which shows are included in the weekly episode list.</p>
        <label className="block text-sm font-medium text-night-100">TVmaze show IDs<input className={`${fieldClass} font-mono`} name="tvmazeShowIds" onChange={event => setShowIds(event.target.value)} value={showIds} /><span className="mt-1 block text-xs leading-5 text-night-400">Enter positive IDs separated by commas. The initial selection uses Robotman’s current built-in list.</span></label>
      </fieldset>
      <div className="mt-5"><button className={primaryButtonClass} disabled={saving} type="submit">{saving ? <span className="inline-flex items-center gap-2"><LoadingSpinner className="size-4 text-black" label="Saving…" />Saving…</span> : 'Save Settings'}</button></div>
    </form>}
  </section>;
}
