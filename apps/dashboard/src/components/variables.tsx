export type Variable = { name: string; meaning: string };

export const messageVariables: Variable[] = [
  { name: 'user', meaning: 'mentions the person who ran the command' },
  { name: 'username', meaning: 'their username, without a mention' },
  { name: 'avatar', meaning: 'the link to their avatar image' },
  { name: 'server', meaning: 'this server’s name' },
  { name: 'channel', meaning: 'mentions the channel the command was used in' },
  { name: 'trigger', meaning: 'inserts exactly what the requester typed (or the collection’s name when picked from suggestions)' },
];
export const curatorVariables: Variable[] = [
  { name: 'curator_name', meaning: 'the saved curator name, without mentioning them' },
  { name: 'curator', meaning: 'the same as {curator_name}' },
];

const chipClass = 'inline-flex shrink-0 items-center rounded-md border border-night-700 bg-night-900 px-2 py-0.5 font-mono text-xs text-sunset-200';

/** Lists the variables a message can use. With `onInsert`, each one is a button that inserts it at the cursor. */
export function VariableGuide({ label = 'Available variables', variables, onInsert, note }: { label?: string; variables: Variable[]; onInsert?: (token: string) => void; note?: string }) {
  return <section aria-label={label} className="mt-3 rounded-lg border border-night-800 bg-night-950/60 px-3 py-3">
    <p className="text-[13px] font-semibold text-night-200">{label === 'Available variables' ? 'Variables' : label}</p>
    <p className="mt-1 text-xs leading-5 text-night-400">{note ?? (onInsert ? 'Select one to insert it at the cursor. They also work inside embed fields.' : 'Replaced with the real value when the message is sent.')}</p>
    <ul className="mt-3 grid gap-2 text-xs leading-5 text-night-300 sm:grid-cols-2">{variables.map(variable => {
      const token = `{${variable.name}}`;
      return <li className="flex items-start gap-2" key={variable.name}>
        {onInsert
          ? <button aria-label={`Insert ${token}`} className={`${chipClass} cursor-pointer hover:border-sunset-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-sunset-400`} onClick={() => onInsert(token)} type="button">{token}</button>
          : <code className={chipClass}>{token}</code>}
        <span>{variable.meaning}</span>
      </li>;
    })}</ul>
  </section>;
}
