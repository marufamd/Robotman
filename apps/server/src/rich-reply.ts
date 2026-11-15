interface ResponseInput { trigger: string; aliases: string[]; content: string; embedsJson: string; }

export function normalizeReply(input: ResponseInput) {
  const trigger = input.trigger.trim();
  const aliases = input.aliases.map(alias => alias.trim());
  if (!trigger || aliases.some(alias => !alias) || new Set([trigger, ...aliases].map(value => value.toLocaleLowerCase('en-US'))).size !== aliases.length + 1) {
    throw new Error('Trigger and aliases must be non-empty and distinct.');
  }
  if (trigger.length > 100 || aliases.some(alias => alias.length > 100)) throw new Error('Triggers and aliases must be 100 characters or fewer.');
  if (input.content.length > 2000) throw new Error('Message text must be 2,000 characters or fewer.');
  let embeds: Record<string, unknown>[];
  try {
    const parsed: unknown = JSON.parse(input.embedsJson || '[]');
    if (!Array.isArray(parsed) || parsed.some(embed => !embed || typeof embed !== 'object' || Array.isArray(embed))) throw new Error();
    embeds = parsed as Record<string, unknown>[];
  } catch {
    throw new Error('Embeds must be a JSON array of embed objects.');
  }
  if (embeds.length > 10) throw new Error('A Response can contain at most 10 embeds.');
  const textLength = (embed: Record<string, unknown>) => {
    const author = typeof embed.author === 'object' && embed.author !== null ? embed.author as Record<string, unknown> : {};
    const footer = typeof embed.footer === 'object' && embed.footer !== null ? embed.footer as Record<string, unknown> : {};
    const fields = Array.isArray(embed.fields) ? embed.fields : [];
    return [embed.title, embed.description, author.name, footer.text, ...fields.flatMap(field => {
      const value = typeof field === 'object' && field !== null ? field as Record<string, unknown> : {};
      return [value.name, value.value];
    })].reduce<number>((sum, value) => sum + (typeof value === 'string' ? value.length : 0), 0);
  };
  for (const [index, embed] of embeds.entries()) {
    const author = typeof embed.author === 'object' && embed.author !== null ? embed.author as Record<string, unknown> : {};
    const footer = typeof embed.footer === 'object' && embed.footer !== null ? embed.footer as Record<string, unknown> : {};
    const fields = Array.isArray(embed.fields) ? embed.fields : [];
    const label = `Embed ${index + 1}`;
    const length = (value: unknown) => typeof value === 'string' ? value.length : 0;
    if (length(embed.title) > 256) throw new Error(`${label} title must be 256 characters or fewer.`);
    if (length(embed.description) > 4096) throw new Error(`${label} description must be 4,096 characters or fewer.`);
    if (length(author.name) > 256) throw new Error(`${label} author name must be 256 characters or fewer.`);
    if (length(footer.text) > 2048) throw new Error(`${label} footer text must be 2,048 characters or fewer.`);
    if (fields.length > 25) throw new Error(`${label} can contain at most 25 fields.`);
    for (const [fieldIndex, field] of fields.entries()) {
      const item = typeof field === 'object' && field !== null ? field as Record<string, unknown> : {};
      if (length(item.name) > 256) throw new Error(`${label}, field ${fieldIndex + 1} name must be 256 characters or fewer.`);
      if (length(item.value) > 1024) throw new Error(`${label}, field ${fieldIndex + 1} value must be 1,024 characters or fewer.`);
    }
  }
  const totalEmbedText = embeds.reduce<number>((sum, embed) => sum + textLength(embed), 0);
  if (totalEmbedText > 6000) throw new Error('Embed text across a Response must be 6,000 characters or fewer.');
  const hasContent = input.content.trim().length > 0 || embeds.some(embed => Object.keys(embed).some(key => key !== 'type'));
  if (!hasContent) throw new Error('Add message text or at least one non-empty embed.');
  return { trigger, aliases, content: input.content, embeds };
}

