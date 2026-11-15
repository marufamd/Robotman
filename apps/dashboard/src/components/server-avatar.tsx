import type { ManagedServer } from '../lib/graphql';

export function ServerAvatar({ server, size = 'large' }: { server: Pick<ManagedServer, 'id' | 'name' | 'icon'>; size?: 'small' | 'large' }) {
  const className = size === 'large' ? 'size-20 rounded-2xl border-4 border-night-900 text-xl' : 'size-10 rounded-xl border border-night-700 text-sm';
  const image = server.icon ? `https://cdn.discordapp.com/icons/${server.id}/${server.icon}.png?size=${size === 'large' ? 96 : 64}` : undefined;
  const initials = server.name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase();

  return image
    ? <img alt={`${server.name} server icon`} className={`${className} shrink-0 bg-night-800 object-cover`} src={image} />
    : <span aria-label={`${server.name} server icon`} className={`${className} grid shrink-0 place-items-center bg-night-800 font-display font-bold text-white`} role="img">{initials}</span>;
}
