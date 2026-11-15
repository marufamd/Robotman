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

**Variable** (also called a placeholder):
A token in a Response or Recommendation Entry reply, or in a category default introduction, that is replaced with information about the person who made the request, the current server, the channel, or what they entered.

The supported placeholders are `{user}` (a mention of the requester), `{username}` (the requester's username), `{avatar}` (the requester's avatar URL), `{server}` (the current server's name), `{channel}` (a mention of the channel where the Response was requested), and `{trigger}` (exactly what the requester entered: the trigger or alias they typed, or a collection's name when picked from suggestions). Personal Recommendation lists also support `{curator_name}` and `{curator}` (the saved curator name). They may appear in message text and textual embed properties. The list titles and introductions of Taste Test, Characters and Writers are plain text with no variables.

**Change History**:
The record of who created, edited and deleted each Response and Recommendation Entry, and when. Changes to dashboard settings are not recorded. It is shown newest or oldest first, in pages.

**Response Introduction**:
Opening text shown above a Response's own text. A server sets one default in Response Settings; each Response can use it, replace it with its own, or omit it. New and imported Responses use the default. It supports the same variables as message text, except the curator ones. Recommendation Entries have the same choice with their category's default introduction.

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

## Deployment and migration

**Legacy Export**:
A JSON snapshot of the previous Robotman's auto-response and history tables, produced from its PostgreSQL database and used only to populate v7.

**Cutover**:
The maintenance-window moment when the old bot stops, the Legacy Export is imported into an empty v7 database, and Discord's interactions are pointed at v7.

**Edge proxy**:
The shared reverse proxy on the server that terminates HTTPS for Robotman and any other hosted app.
