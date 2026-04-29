module Discord
  class GuildSummaryBuilder
    MANAGE_GUILD_PERMISSION = 0x20

    def self.call(guilds)
      Array(guilds).filter_map do |guild|
        next unless manageable?(guild)

        {
          guildId: guild.fetch("id"),
          name: guild.fetch("name"),
          iconUrl: icon_url_for(guild),
          isOwner: guild["owner"] == true
        }
      end
    end

    def self.manageable?(guild)
      guild["owner"] == true || (guild["permissions"].to_i & MANAGE_GUILD_PERMISSION).positive?
    end

    def self.icon_url_for(guild)
      return nil if guild["icon"].to_s.empty?

      "https://cdn.discordapp.com/icons/#{guild.fetch('id')}/#{guild.fetch('icon')}.png?size=256"
    end
  end
end
