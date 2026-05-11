module Internal
  class AutoResponsesController < ApplicationController
    before_action :authenticate_internal_request!

    def index
      guilds = active_responses
        .group_by(&:guild)
        .map do |guild_id, responses|
          {
            guildId: guild_id,
            triggers: responses.map do |response|
              {
                responseId: response.id,
                name: response.name,
                aliases: response.aliases,
                content: response.content,
                wildcard: response.wildcard
              }
            end
          }
        end
        .sort_by { |guild| guild[:guildId] }

      render json: { guilds: guilds }
    end

    private

    def active_responses
      AutoResponse.where(deleted_at: nil).order(:guild, :updated_at)
    end
  end
end
