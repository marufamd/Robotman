# Robotman Domain

Terms for Robotman's Discord server features and dashboard.

## Servers and access

**Server**:
A Discord server where Robotman may be installed and used. This is the preferred product and user-facing term.

**Managed Server**:
A server whose owner or a member with Manage Server or Administrator permission can manage its Robotman settings.

**Guild**:
The internal domain and Discord API term for a Server. Do not use it in user-facing product copy, routes, or navigation.

**Bot Installation**:
Robotman's authorization in a guild, which makes its server features available there.

**Management Permission Snapshot**:
The Managed Servers and management permissions captured from the first successful Discord server-list fetch for a dashboard sign-in. It remains authoritative for that sign-in until the session ends; a new sign-in captures a new snapshot.

**Release List**:
A weekly list of comics scheduled to be released on Tuesday.

**Release-list Schedule**:
The day, time, time zone, and destination channel for a Server's weekly Release List.

**Show Schedule**:
The episodes scheduled during a week for the television series selected by a Guild.

**Episode Comment Template**:
Formatted text about a scheduled episode that a guild member can use to write a comment.

## Responses

**Response**:
Saved text or embed content returned when a person requests it with a trigger.

**Response Placeholder**:
A token in Response text that is replaced with information about the person who requested the Response, the current server, or the channel where it was requested.

The supported placeholders are `{user}` (a mention of the requester), `{username}` (the requester's username), `{avatar}` (the requester's avatar URL), `{server}` (the current server's name), and `{channel}` (a mention of the channel where the Response was requested). They may appear in message text and textual embed properties.

**Response Preview**:
A Discord slash-command request by a member, followed by Robotman's reply to that request in its server channel.

**Trigger**:
The exact phrase a person enters to request a Response. Matching ignores letter case.

**Alias**:
An additional exact phrase that requests the same Response as its primary trigger.

## Recommendations

**Recommendation Entry**:
A named, freely authored collection of recommended works in one of four categories: character, writer, moderator, or booster. Character collections may also cover teams, reading arcs, and themes; Moderator and Booster collections represent a curator's personal book recommendations.

**Recommendation Curator**:
The person whose personal book recommendations make up a Moderator or Booster Recommendation Entry. The curator is distinct from the manager who creates or edits the entry. A curator has at most one personal recommendation list per Server, categorized as either Moderator or Booster. The saved curator name also names that list. Role changes or leaving the server do not change the saved collection.

**Recommendation Introduction**:
Opening text presented before a Recommendation Entry's authored reply. An entry may use its category's default wording, its own wording, or no introduction.

**Recommendation Search Alias**:
An additional name used to find a Recommendation Entry in autocomplete. It does not create a Response trigger or change the collection's display name.

**Recommendation List**:
A browsable index of Recommendation Entry names. Taste Test groups personal lists under Mods and Boosters; Character and Writer lists each have their own index. These lists show names rather than full replies or individual books.
