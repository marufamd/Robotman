require "digest"

class ApplicationController < ActionController::API
  include ActionController::Cookies
  include ActionController::RequestForgeryProtection

  protect_from_forgery with: :exception

  rescue_from Discord::OauthClient::Error, with: :render_oauth_error
  rescue_from Discord::OauthClient::RateLimited, with: :render_oauth_rate_limited

  DISCORD_GUILD_CACHE_TTL = 2.minutes

  private

  def current_session_user
    session[:discord_user]&.deep_symbolize_keys
  end

  def current_discord_access_token
    session[:discord_access_token]
  end

  def authenticate_session!
    return if current_session_user

    render json: { message: "Unauthorized" }, status: :unauthorized
  end

  def current_user_id
    current_session_user[:userId] || current_session_user[:user_id] || current_session_user[:id]
  end

  def current_user_display_name
    current_session_user[:displayName] ||
      current_session_user[:display_name] ||
      current_session_user[:global_name] ||
      current_session_user[:username]
  end

  def render_oauth_error(error)
    Rails.logger.error("discord_oauth_error message=#{error.message}")
    render json: { message: error.message }, status: :bad_gateway
  end

  def render_oauth_rate_limited(error)
    Rails.logger.warn("discord_rate_limited retry_after=#{error.retry_after}")
    response.set_header("Retry-After", error.retry_after.ceil.to_s) if error.retry_after
    render json: { message: "Discord is rate limiting requests. Please try again shortly." }, status: :too_many_requests
  end

  GUILD_FETCH_MUTEX = Mutex.new

  def current_dashboard_guilds
    return [] unless current_session_user && current_discord_access_token

    Rails.cache.fetch(discord_guild_cache_key, expires_in: DISCORD_GUILD_CACHE_TTL) do
      GUILD_FETCH_MUTEX.synchronize do
        cached = Rails.cache.read(discord_guild_cache_key)
        next cached if cached

        Discord::GuildSummaryBuilder.call(
          oauth_client.fetch_current_guilds(current_discord_access_token)
        )
      end
    end
  end

  def current_accessible_guild_ids
    current_dashboard_guilds.map { |guild| guild[:guildId] || guild["guildId"] }
  end

  def discord_guild_cache_key
    user_id = current_session_user[:userId] || current_session_user["userId"]
    token_digest = Digest::SHA256.hexdigest(current_discord_access_token.to_s)
    "discord:guilds:#{user_id}:#{token_digest}"
  end

  def oauth_client
    @oauth_client ||= Discord::OauthClient.new(
      client_id: ENV.fetch("DISCORD_CLIENT_ID"),
      client_secret: ENV.fetch("DISCORD_CLIENT_SECRET")
    )
  end
end
