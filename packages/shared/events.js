"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventType = void 0;
var EventType;
(function (EventType) {
    // From Gateway
    EventType["DISCORD_INTERACTION"] = "discord.interaction.create";
    EventType["DISCORD_MESSAGE"] = "discord.message.create";
    // From Workers/Engine (Outbound back to Discord)
    EventType["DISCORD_OUTBOUND_MESSAGE"] = "discord.message.outbound";
    EventType["DISCORD_OUTBOUND_REPLY"] = "discord.interaction.reply";
    // From Ruby API (Cache Invalidation)
    EventType["DASHBOARD_RESPONSE_UPDATED"] = "dashboard.response.updated";
    EventType["DASHBOARD_SETTINGS_UPDATED"] = "dashboard.settings.updated";
})(EventType || (exports.EventType = EventType = {}));
