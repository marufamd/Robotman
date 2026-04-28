require "json"
require "rails_helper"

RSpec.describe Rabbitmq::DashboardEventPublisher do
  let(:published_messages) { [] }
  let(:exchange) do
    Class.new do
      attr_reader :published_messages

      def initialize(published_messages)
        @published_messages = published_messages
      end

      def publish(body, **options)
        published_messages << { body: body, options: options }
      end
    end.new(published_messages)
  end
  let(:publisher) do
    described_class.new(
      exchange: exchange,
      traceparent: "00-test-traceparent",
      clock: -> { Time.utc(2026, 4, 26, 12, 0, 0) }
    )
  end

  describe "#publish_response_updated!" do
    it "publishes a create event with the expected envelope and payload" do
      publisher.publish_response_updated!(
        guild_id: "guild-1",
        action: "create",
        response_id: "response-1",
        data: {
          name: "welcome",
          type: "text",
          content: "hello",
          aliases: ["hi"],
          wildcard: false,
          embed: true,
          embed_color: 16_777_215
        }
      )

      message = published_messages.fetch(0)
      parsed_body = JSON.parse(message[:body])

      expect(message[:options]).to include(
        routing_key: "dashboard.response.updated",
        persistent: true,
        content_type: "application/json"
      )
      expect(parsed_body["eventId"]).to be_a(String)
      expect(parsed_body["timestamp"]).to eq("2026-04-26T12:00:00Z")
      expect(parsed_body["traceparent"]).to eq("00-test-traceparent")
      expect(parsed_body["type"]).to eq("dashboard.response.updated")
      expect(parsed_body["payload"]).to eq(
        "guildId" => "guild-1",
        "action" => "CREATE",
        "responseId" => "response-1",
        "data" => {
          "name" => "welcome",
          "type" => "text",
          "content" => "hello",
          "aliases" => ["hi"],
          "wildcard" => false,
          "embed" => true,
          "embedColor" => 16_777_215
        }
      )
    end

    it "omits data for delete events" do
      publisher.publish_response_updated!(
        guild_id: "guild-1",
        action: "DELETE",
        response_id: "response-1"
      )

      parsed_body = JSON.parse(published_messages.fetch(0)[:body])

      expect(parsed_body["payload"]).to eq(
        "guildId" => "guild-1",
        "action" => "DELETE",
        "responseId" => "response-1"
      )
    end

    it "rejects create/update events without data" do
      expect do
        publisher.publish_response_updated!(
          guild_id: "guild-1",
          action: "UPDATE",
          response_id: "response-1"
        )
      end.to raise_error(ArgumentError, "data is required for CREATE and UPDATE events")
    end

    it "rejects delete events with data" do
      expect do
        publisher.publish_response_updated!(
          guild_id: "guild-1",
          action: "DELETE",
          response_id: "response-1",
          data: { name: "welcome" }
        )
      end.to raise_error(ArgumentError, "data must be omitted for DELETE events")
    end
  end

  describe "#publish_settings_updated!" do
    it "publishes the settings invalidation payload" do
      publisher.publish_settings_updated!(
        guild_id: "guild-1",
        is_ranking_enabled: true,
        audit_log_channel_id: "channel-1"
      )

      message = published_messages.fetch(0)
      parsed_body = JSON.parse(message[:body])

      expect(message[:options]).to include(routing_key: "dashboard.settings.updated")
      expect(parsed_body["type"]).to eq("dashboard.settings.updated")
      expect(parsed_body["payload"]).to eq(
        "guildId" => "guild-1",
        "isRankingEnabled" => true,
        "auditLogChannelId" => "channel-1"
      )
    end
  end
end
