class GuildsController < ApplicationController
  before_action :authenticate_session!

  def index
    return if performed?

    guilds = Discord::GuildSummaryBuilder.call(
      oauth_client.fetch_current_guilds(current_discord_access_token)
    )

    render json: guilds
  end

  private

  def oauth_client
    @oauth_client ||= Discord::OauthClient.new(
      client_id: ENV.fetch("DISCORD_CLIENT_ID"),
      client_secret: ENV.fetch("DISCORD_CLIENT_SECRET")
    )
  end
end
