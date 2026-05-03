CREATE TABLE IF NOT EXISTS auto_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild TEXT NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    content TEXT NOT NULL,
    aliases TEXT[] DEFAULT ARRAY[]::TEXT[],
    author TEXT NOT NULL,
    author_username TEXT NOT NULL,
    editor TEXT,
    editor_username TEXT,
    wildcard BOOLEAN NOT NULL DEFAULT false,
    embed BOOLEAN NOT NULL DEFAULT false,
    embed_color INTEGER,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMPTZ,
    UNIQUE (guild, name)
);

CREATE TABLE history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guild TEXT NOT NULL,
    user_id TEXT NOT NULL,
    user_username TEXT NOT NULL,
    action TEXT NOT NULL, -- e.g., 'CREATE', 'UPDATE', 'DELETE', 'TOGGLE'
    resource_type TEXT NOT NULL, -- e.g., 'AUTO_RESPONSE', 'GUILD_SETTINGS'
    resource_id TEXT,
    resource_name TEXT,
    changes JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_history_guild ON history(guild);
CREATE INDEX idx_history_resource ON history(resource_type, resource_id);
CREATE INDEX idx_auto_responses_guild ON auto_responses(guild);
CREATE INDEX idx_ranks_guild ON ranks(guild);

CREATE TABLE guild_settings (
    guild TEXT PRIMARY KEY,
    prefix VARCHAR(15),
    is_ranking_enabled BOOLEAN NOT NULL DEFAULT false,
    audit_log_channel_id TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ranks (
    guild TEXT NOT NULL,
    user_id TEXT NOT NULL,
    score INTEGER DEFAULT 0,
    last_message_at TIMESTAMPTZ,
    PRIMARY KEY (guild, user_id)
);