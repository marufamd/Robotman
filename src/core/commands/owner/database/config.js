const Command = require("../../../classes/Command");
const { parseWebhook } = require("../../../../util");

module.exports = class extends Command {
    constructor(client) {
        super(client, {
            name: "config",
            description: "Updates releases webhook config",
            group: "owner",
            aliases: ["webhook", "schedule", "conf"],
            usage: "(-webhook | -schedule) <webhook link | new schedule>",
            args: {
                flags: {
                    list: { matches: ["l", "list"] },
                    webhook: { matches: ["w", "webhook"] },
                    schedule: { matches: ["s", "schedule"] }
                }
            }
        });
    }

    async run(message, { args, flags }) {
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

        const data = await this.client.util.get();
        
        if (flags.list || !Object.keys(flags).length) {
            if (!data.scheduleWebhook && !data.scheduleTime.length) return message.respond("There is no configuration currently set.");
            const str = ["= Current Configuration ="];

            if (data.scheduleTime.length) {
                const [day, hour, minute] = data.scheduleTime;
                str.push(`Schedule :: ${days[day]} at ${hour.length === 1 ? "0" + hour : hour}:${minute.length === 1 ? "0" + minute : minute}`);
            }
            if (data.scheduleWebhook) {
                const webhook = parseWebhook(data.scheduleWebhook);
                str.push(`Webhook  :: ${(await this.client.fetchWebhook(webhook.id, webhook.token)).name}`);
            }

            return message.code(str, "asciidoc");
        }

        let finalResp;

        if (flags.webhook) {
            if (!args[0]) return message.usage(this.usage);

            const { id, token } = parseWebhook(args[0]);

            const webhook = await this.client.fetchWebhook(id, token).catch(() => null);
            if (!webhook) return message.respond("Invalid Webhook URL");

            this.client.util.set({ scheduleWebhook: args[0] });
            finalResp = `Set webhook to **${webhook.name}**`;
        } else if (flags.schedule) {
            if (args.length < 3) return message.usage(this.usage);
            this.client.util.set({ scheduleTime: args });

            const [day, hour, minute] = args;

            finalResp = `Set schedule to **${days[day]}** at **${hour.length === 1 ? "0" + hour : hour}:${minute.length === 1 ? "0" + minute : minute}**`;
            this.client.loadSchedule();
        }

        return message.respond(finalResp);
    }
};