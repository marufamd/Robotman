module Internal
  class GuildSettingsController < ApplicationController
    before_action :authenticate_internal_request!

    def index
      guilds = GuildSetting
        .order(:guild)
        .map do |settings|
          {
            guildId: settings.guild,
            isRankingEnabled: settings.is_ranking_enabled,
            prefix: settings.prefix.presence
          }
        end

      render json: { guilds: guilds }
    end
  end
end
