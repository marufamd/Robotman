class GuildSettingsController < ApplicationController
  before_action :authenticate_session!
  before_action :ensure_guild_access!

  def show
    render json: serialize_settings(settings_record || default_settings)
  end

  def update
    settings = settings_record || GuildSetting.new(guild: guild_id)
    action = settings.persisted? ? "UPDATE" : "CREATE"
    before_state = settings.persisted? ? audit_log_snapshot(settings) : nil
    settings.assign_attributes(settings_attributes)

    if settings.save
      AuditLog::HistoryWriter.record!(
        guild: guild_id,
        user_id: current_user_id,
        user_username: current_user_display_name,
        action: action,
        resource_type: "GUILD_SETTINGS",
        resource_id: guild_id,
        resource_name: "Server Settings",
        before: before_state,
        after: audit_log_snapshot(settings)
      )

      dashboard_event_publisher.publish_settings_updated!(
        guild_id: settings.guild,
        prefix: settings.prefix.presence,
        is_ranking_enabled: settings.is_ranking_enabled,
        audit_log_channel_id: settings.audit_log_channel_id.presence,
        traceparent: request.headers["traceparent"]
      )

      render json: serialize_settings(settings)
    else
      render json: { message: settings.errors.full_messages.to_sentence }, status: :unprocessable_entity
    end
  end

  private

  def guild_id
    params[:guild_id].to_s
  end

  def settings_record
    @settings_record ||= GuildSetting.find_by(guild: guild_id)
  end

  def default_settings
    GuildSetting.new(
      guild: guild_id,
      prefix: nil,
      is_ranking_enabled: false,
      audit_log_channel_id: nil
    )
  end

  def settings_attributes
    permitted = params.permit(:prefix, :isRankingEnabled, :auditLogChannelId)

    {
      prefix: permitted[:prefix].presence,
      is_ranking_enabled: permitted[:isRankingEnabled],
      audit_log_channel_id: permitted[:auditLogChannelId].presence
    }
  end

  def serialize_settings(settings)
    {
      guildId: settings.guild,
      prefix: settings.prefix.presence,
      isRankingEnabled: settings.is_ranking_enabled,
      auditLogChannelId: settings.audit_log_channel_id.presence
    }
  end

  def audit_log_snapshot(settings)
    {
      prefix: settings.prefix.presence,
      isRankingEnabled: settings.is_ranking_enabled,
      auditLogChannelId: settings.audit_log_channel_id.presence
    }
  end

  def ensure_guild_access!
    return if current_accessible_guild_ids.include?(guild_id)

    render json: { message: "Guild not found" }, status: :not_found
  end

  def dashboard_event_publisher
    @dashboard_event_publisher ||= Rabbitmq::DashboardEventPublisher.new
  end
end
