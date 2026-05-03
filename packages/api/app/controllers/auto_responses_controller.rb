class AutoResponsesController < ApplicationController
  before_action :authenticate_session!
  before_action :ensure_guild_access!
  before_action :set_auto_response!, only: %i[update destroy]

  def index
    render json: active_responses.order(updated_at: :desc).map { |response| serialize_response(response) }
  end

  def create
    auto_response = AutoResponse.new(create_attributes)

    if auto_response.save
      dashboard_event_publisher.publish_response_updated!(
        guild_id: auto_response.guild,
        action: "CREATE",
        response_id: auto_response.id,
        data: publisher_payload(auto_response),
        traceparent: request.headers["traceparent"]
      )

      render json: serialize_response(auto_response), status: :created
    else
      render json: { message: auto_response.errors.full_messages.to_sentence }, status: :unprocessable_entity
    end
  end

  def update
    if @auto_response.update(update_attributes)
      dashboard_event_publisher.publish_response_updated!(
        guild_id: @auto_response.guild,
        action: "UPDATE",
        response_id: @auto_response.id,
        data: publisher_payload(@auto_response),
        traceparent: request.headers["traceparent"]
      )

      render json: serialize_response(@auto_response)
    else
      render json: { message: @auto_response.errors.full_messages.to_sentence }, status: :unprocessable_entity
    end
  end

  def destroy
    response_id = @auto_response.id
    @auto_response.destroy!

    dashboard_event_publisher.publish_response_updated!(
      guild_id: guild_id,
      action: "DELETE",
      response_id: response_id,
      traceparent: request.headers["traceparent"]
    )

    head :no_content
  end

  private

  def guild_id
    params[:guild_id].to_s
  end

  def active_responses
    AutoResponse.where(guild: guild_id)
  end

  def set_auto_response!
    @auto_response = active_responses.find_by(id: params[:id])
    return if @auto_response

    render json: { message: "Auto response not found" }, status: :not_found
  end

  def create_attributes
    response_attributes.merge(
      guild: guild_id,
      author: current_user_id,
      author_username: current_user_display_name,
      editor: nil,
      editor_username: nil
    )
  end

  def update_attributes
    response_attributes.merge(
      editor: current_user_id,
      editor_username: current_user_display_name
    )
  end

  def response_attributes
    permitted = params.permit(
      :trigger,
      :name,
      :type,
      :content,
      :wildcard,
      :embed,
      :embedColor,
      aliases: []
    )

    {
      name: permitted[:trigger].presence.to_s.strip.presence || permitted[:name].to_s.strip,
      type: permitted[:type].to_s.strip,
      content: permitted[:content].to_s.strip,
      aliases: normalize_aliases(permitted[:aliases]),
      wildcard: permitted[:wildcard],
      embed: permitted[:embed],
      embed_color: permitted[:embedColor]
    }
  end

  def normalize_aliases(aliases)
    Array(aliases).map { |alias_name| alias_name.to_s.strip }.reject(&:blank?)
  end

  def serialize_response(response)
    {
      id: response.id,
      guildId: response.guild,
      name: response.name,
      trigger: response.name,
      type: response.type,
      content: response.content,
      aliases: response.aliases,
      wildcard: response.wildcard,
      embed: response.embed,
      embedColor: response.embed_color,
      createdBy: response.author_username,
      lastEditedBy: response.editor_username.presence,
      createdAt: response.created_at.iso8601,
      updatedAt: response.updated_at.iso8601
    }
  end

  def publisher_payload(response)
    {
      name: response.name,
      type: response.type,
      content: response.content,
      aliases: response.aliases,
      wildcard: response.wildcard,
      embed: response.embed,
      embed_color: response.embed_color
    }
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

  def ensure_guild_access!
    return if current_accessible_guild_ids.include?(guild_id)

    render json: { message: "Guild not found" }, status: :not_found
  end

  def dashboard_event_publisher
    @dashboard_event_publisher ||= Rabbitmq::DashboardEventPublisher.new
  end
end
