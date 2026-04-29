class SessionsController < ApplicationController
  skip_before_action :verify_authenticity_token, only: :create

  def start
    session[:discord_oauth_state] = SecureRandom.hex(24)
    session[:dashboard_redirect_target] = Auth::RedirectTargetResolver.call(
      origin: params[:origin],
      dashboard_url: dashboard_url
    )

    redirect_to oauth_client.authorization_url(
      state: session[:discord_oauth_state],
      redirect_uri: discord_redirect_uri
    )
  end

  def create
    if params[:error].present?
      redirect_to failure_redirect(params[:error_description].presence || params[:error])
      return
    end

    expected_state = session.delete(:discord_oauth_state)

    unless expected_state.present? &&
      params[:state].present? &&
      ActiveSupport::SecurityUtils.secure_compare(params[:state].to_s, expected_state.to_s)
      redirect_to failure_redirect("invalid_state")
      return
    end

    token_payload = oauth_client.exchange_code_for_token(
      code: params[:code].to_s,
      redirect_uri: discord_redirect_uri
    )
    user_payload = oauth_client.fetch_current_user(token_payload.fetch("access_token"))

    session[:discord_access_token] = token_payload.fetch("access_token")
    session[:discord_user] = Discord::SessionPayloadBuilder.call(user_payload)

    redirect_to success_redirect
  rescue KeyError, Discord::OauthClient::Error => error
    redirect_to failure_redirect(error.message)
  end

  def show
    if current_session_user
      render json: current_session_user.slice(:userId, :username, :avatarUrl)
    else
      render json: { message: "Unauthorized" }, status: :unauthorized
    end
  end

  def destroy
    reset_session
    head :no_content
  end

  def failure
    redirect_to failure_redirect(params[:message].presence || "oauth_failure")
  end

  private

  def oauth_client
    @oauth_client ||= Discord::OauthClient.new(
      client_id: ENV.fetch("DISCORD_CLIENT_ID"),
      client_secret: ENV.fetch("DISCORD_CLIENT_SECRET")
    )
  end

  def dashboard_url
    ENV.fetch("DASHBOARD_URL", "http://localhost:3000")
  end

  def discord_redirect_uri
    "#{request.base_url}/auth/discord/callback"
  end

  def success_redirect
    session.delete(:dashboard_redirect_target).presence || "#{dashboard_url}/guilds"
  end

  def failure_redirect(message)
    reset_session
    "#{dashboard_url}/login?error=#{Rack::Utils.escape(message.to_s)}"
  end
end
