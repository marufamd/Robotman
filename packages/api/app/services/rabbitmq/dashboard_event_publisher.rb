require "bunny"
require "json"
require "securerandom"
require "time"

module Rabbitmq
  class DashboardEventPublisher
    EXCHANGE_NAME = "robotman.events".freeze
    RESPONSE_UPDATED_TYPE = "dashboard.response.updated".freeze
    SETTINGS_UPDATED_TYPE = "dashboard.settings.updated".freeze
    RESPONSE_ACTIONS = %w[CREATE UPDATE DELETE].freeze

    def initialize(connection: nil, exchange: nil, traceparent: nil, clock: -> { Time.now.utc })
      @connection = connection
      @exchange = exchange
      @traceparent = traceparent
      @clock = clock
    end

    def publish_response_updated!(guild_id:, action:, response_id:, data: nil, traceparent: @traceparent)
      normalized_action = action.to_s.upcase
      validate_response_action!(normalized_action)
      validate_response_data!(normalized_action, data)

      publish!(
        type: RESPONSE_UPDATED_TYPE,
        payload: {
          guildId: guild_id,
          action: normalized_action,
          responseId: response_id,
          data: normalized_response_data(data)
        }.compact,
        traceparent: traceparent
      )
    end

    def publish_settings_updated!(guild_id:, prefix:, is_ranking_enabled:, audit_log_channel_id:, traceparent: @traceparent)
      publish!(
        type: SETTINGS_UPDATED_TYPE,
        payload: {
          guildId: guild_id,
          prefix: prefix,
          isRankingEnabled: is_ranking_enabled,
          auditLogChannelId: audit_log_channel_id
        },
        traceparent: traceparent
      )
    end

    def close
      return if @connection.nil?
      return unless @connection.open?

      @connection.close
    end

    private

    def publish!(type:, payload:, traceparent:)
      active_exchange.publish(
        JSON.generate(
          {
            eventId: SecureRandom.uuid,
            timestamp: @clock.call.iso8601,
            traceparent: traceparent,
            type: type,
            payload: payload
          }.compact
        ),
        routing_key: type,
        persistent: true,
        content_type: "application/json"
      )
    end

    def active_exchange
      @exchange ||= begin
        @connection ||= Bunny.new(connection_options)
        @connection.start unless @connection.open?

        channel = @connection.create_channel
        channel.topic(EXCHANGE_NAME, durable: true)
      end
    end

    def connection_options
      {
        host: ENV.fetch("RABBITMQ_HOST", "127.0.0.1"),
        port: ENV.fetch("RABBITMQ_PORT", "5672").to_i,
        username: ENV.fetch("RABBITMQ_DEFAULT_USER", "admin"),
        password: ENV.fetch("RABBITMQ_DEFAULT_PASS", "password"),
        vhost: ENV.fetch("RABBITMQ_VHOST", "/"),
        automatically_recover: true
      }
    end

    def validate_response_action!(action)
      return if RESPONSE_ACTIONS.include?(action)

      raise ArgumentError, "action must be one of: #{RESPONSE_ACTIONS.join(', ')}"
    end

    def validate_response_data!(action, data)
      return if action == "DELETE" && data.nil?
      return if %w[CREATE UPDATE].include?(action) && !data.nil?

      message =
        if action == "DELETE"
          "data must be omitted for DELETE events"
        else
          "data is required for CREATE and UPDATE events"
        end

      raise ArgumentError, message
    end

    def normalized_response_data(data)
      return nil if data.nil?

      {
        name: fetch_value(data, :name),
        type: fetch_value(data, :type),
        content: fetch_value(data, :content),
        aliases: fetch_value(data, :aliases),
        wildcard: fetch_value(data, :wildcard),
        embed: fetch_value(data, :embed),
        embedColor: fetch_value(data, :embed_color, :embedColor)
      }
    end

    def fetch_value(data, *keys)
      keys.each do |key|
        return data[key] if data.respond_to?(:key?) && data.key?(key)
        return data[key.to_s] if data.respond_to?(:key?) && data.key?(key.to_s)
      end

      nil
    end
  end
end
