class ApplicationController < ActionController::API
  include ActionController::Cookies
  include ActionController::RequestForgeryProtection

  protect_from_forgery with: :exception

  rescue_from Discord::OauthClient::Error, with: :render_oauth_error

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

  def render_oauth_error(error)
    Rails.logger.error("discord_oauth_error message=#{error.message}")
    render json: { message: error.message }, status: :bad_gateway
  end
end
