require "rails_helper"

RSpec.describe "GuildSettings", type: :request do
  let(:client) { instance_double(Discord::OauthClient) }
  let(:publisher) { instance_double(Rabbitmq::DashboardEventPublisher, publish_settings_updated!: true) }
  let(:csrf_token) do
    get "/csrf"
    response.parsed_body.fetch("csrfToken")
  end

  before do
    Rails.cache.clear
    History.delete_all
    allow(Discord::OauthClient).to receive(:new).and_return(client)
    allow(Rabbitmq::DashboardEventPublisher).to receive(:new).and_return(publisher)
    allow(client).to receive(:authorization_url).and_return("https://discord.com/oauth2/authorize?state=known-state")
    allow(client).to receive(:exchange_code_for_token).and_return("access_token" => "user-token")
    allow(client).to receive(:fetch_current_user).and_return(
      "id" => "user-1",
      "username" => "robotman",
      "global_name" => "Robotman",
      "avatar" => nil
    )
    allow(client).to receive(:fetch_current_guilds).with("user-token").and_return(
      [
        {
          "id" => "guild-1",
          "name" => "Managed Guild",
          "icon" => nil,
          "owner" => false,
          "permissions" => "32"
        }
      ]
    )
    allow(SecureRandom).to receive(:hex).and_return("known-state")
  end

  def authenticate!
    post "/auth/discord", params: { authenticity_token: csrf_token }
    get "/auth/discord/callback", params: { code: "oauth-code", state: "known-state" }
  end

  describe "GET /guilds/:guild_id/settings" do
    it "returns existing settings when a row exists" do
      GuildSetting.create!(
        guild: "guild-1",
        prefix: "!",
        is_ranking_enabled: true,
        audit_log_channel_id: "channel-1"
      )

      authenticate!
      get "/guilds/guild-1/settings"

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to eq(
        "guildId" => "guild-1",
        "prefix" => "!",
        "isRankingEnabled" => true,
        "auditLogChannelId" => "channel-1"
      )
    end

    it "returns synthesized defaults when no row exists" do
      authenticate!
      get "/guilds/guild-1/settings"

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to eq(
        "guildId" => "guild-1",
        "prefix" => nil,
        "isRankingEnabled" => false,
        "auditLogChannelId" => nil
      )
    end

    it "returns unauthorized without a session" do
      get "/guilds/guild-1/settings"

      expect(response).to have_http_status(:unauthorized)
    end

    it "returns not found for an inaccessible guild" do
      authenticate!
      get "/guilds/guild-2/settings"

      expect(response).to have_http_status(:not_found)
    end

    it "reuses cached guild access instead of calling Discord on every request" do
      expect(client).to receive(:fetch_current_guilds).once.with("user-token").and_return(
        [
          {
            "id" => "guild-1",
            "name" => "Managed Guild",
            "icon" => nil,
            "owner" => false,
            "permissions" => "32"
          }
        ]
      )

      authenticate!

      2.times { get "/guilds/guild-1/settings" }

      expect(response).to have_http_status(:ok)
    end
  end

  describe "PATCH /guilds/:guild_id/settings" do
    let(:headers) do
      {
        "CONTENT_TYPE" => "application/json",
        "X-CSRF-Token" => csrf_token
      }
    end

    it "creates a row when one does not exist" do
      authenticate!

      patch "/guilds/guild-1/settings",
        params: {
          guildId: "guild-1",
          prefix: "?",
          isRankingEnabled: true,
          auditLogChannelId: "channel-2"
        }.to_json,
        headers: headers

      expect(response).to have_http_status(:ok)
      expect(GuildSetting.find_by(guild: "guild-1")).to have_attributes(
        prefix: "?",
        is_ranking_enabled: true,
        audit_log_channel_id: "channel-2"
      )
      expect(response.parsed_body).to eq(
        "guildId" => "guild-1",
        "prefix" => "?",
        "isRankingEnabled" => true,
        "auditLogChannelId" => "channel-2"
      )
      expect(publisher).to have_received(:publish_settings_updated!).with(
        guild_id: "guild-1",
        prefix: "?",
        is_ranking_enabled: true,
        audit_log_channel_id: "channel-2",
        traceparent: nil
      )
      expect(History.last).to have_attributes(
        guild: "guild-1",
        user_id: "user-1",
        user_username: "Robotman",
        action: "CREATE",
        resource_type: "GUILD_SETTINGS",
        resource_id: "guild-1",
        resource_name: "Server Settings"
      )
      expect(History.last[:changes]).to eq(
        "after" => {
          "prefix" => "?",
          "isRankingEnabled" => true,
          "auditLogChannelId" => "channel-2"
        }
      )
    end

    it "updates an existing row" do
      GuildSetting.create!(
        guild: "guild-1",
        prefix: "!",
        is_ranking_enabled: false,
        audit_log_channel_id: nil
      )

      authenticate!

      patch "/guilds/guild-1/settings",
        params: {
          guildId: "guild-1",
          prefix: nil,
          isRankingEnabled: true,
          auditLogChannelId: "channel-3"
        }.to_json,
        headers: headers

      expect(response).to have_http_status(:ok)
      expect(GuildSetting.find_by(guild: "guild-1")).to have_attributes(
        prefix: nil,
        is_ranking_enabled: true,
        audit_log_channel_id: "channel-3"
      )
      expect(History.last).to have_attributes(
        action: "UPDATE",
        resource_type: "GUILD_SETTINGS",
        resource_id: "guild-1",
        resource_name: "Server Settings"
      )
      expect(History.last[:changes]).to eq(
        "before" => {
          "prefix" => "!",
          "isRankingEnabled" => false,
          "auditLogChannelId" => nil
        },
        "after" => {
          "prefix" => nil,
          "isRankingEnabled" => true,
          "auditLogChannelId" => "channel-3"
        }
      )
    end
  end
end
