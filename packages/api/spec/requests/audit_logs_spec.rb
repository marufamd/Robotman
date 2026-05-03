require "rails_helper"

RSpec.describe "AuditLogs", type: :request do
  let(:client) { instance_double(Discord::OauthClient) }
  let(:csrf_token) do
    get "/csrf"
    response.parsed_body.fetch("csrfToken")
  end

  before do
    Rails.cache.clear
    History.delete_all
    allow(Discord::OauthClient).to receive(:new).and_return(client)
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

  def create_history!(attributes = {})
    connection = ActiveRecord::Base.connection
    row = {
      guild: "guild-1",
      user_id: "user-1",
      user_username: "Robotman",
      action: "UPDATE",
      resource_type: "AUTO_RESPONSE",
      resource_id: SecureRandom.uuid,
      resource_name: "welcome",
      created_at: Time.current,
      changes: {
        before: { trigger: "welcome" },
        after: { trigger: "welcome-back" }
      }
    }.merge(attributes)

    connection.execute(<<~SQL.squish)
      INSERT INTO history (
        guild,
        user_id,
        user_username,
        action,
        resource_type,
        resource_id,
        resource_name,
        changes,
        created_at
      ) VALUES (
        #{connection.quote(row[:guild])},
        #{connection.quote(row[:user_id])},
        #{connection.quote(row[:user_username])},
        #{connection.quote(row[:action])},
        #{connection.quote(row[:resource_type])},
        #{row[:resource_id].present? ? connection.quote(row[:resource_id]) : "NULL"},
        #{row[:resource_name].present? ? connection.quote(row[:resource_name]) : "NULL"},
        #{row[:changes].present? ? connection.quote(JSON.dump(row[:changes])) : "NULL"},
        #{connection.quote(row[:created_at])}
      )
    SQL

    History.order(created_at: :desc).first
  end

  describe "GET /guilds/:guild_id/audit-log" do
    it "returns paginated audit rows ordered by newest first" do
      older = create_history!(created_at: Time.zone.parse("2026-04-28T10:00:00Z"), resource_name: "older")
      newer = create_history!(created_at: Time.zone.parse("2026-04-28T12:00:00Z"), resource_name: "newer", action: "CREATE")

      authenticate!
      get "/guilds/guild-1/audit-log", params: { page: 1, pageSize: 25 }

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to include(
        "page" => 1,
        "pageSize" => 25,
        "total" => 2,
        "totalPages" => 1
      )
      expect(response.parsed_body.fetch("entries").map { |entry| entry["id"] }).to eq([newer.id, older.id])
      expect(response.parsed_body.fetch("entries").first).to include(
        "guildId" => "guild-1",
        "userId" => "user-1",
        "userUsername" => "Robotman",
        "action" => "CREATE",
        "resourceType" => "AUTO_RESPONSE",
        "resourceName" => "newer",
        "changes" => {
          "before" => { "trigger" => "welcome" },
          "after" => { "trigger" => "welcome-back" }
        }
      )
    end

    it "filters by action, resource type, and text query" do
      create_history!(action: "CREATE", resource_type: "AUTO_RESPONSE", resource_name: "welcome")
      create_history!(action: "UPDATE", resource_type: "GUILD_SETTINGS", resource_name: "Server Settings")

      authenticate!
      get "/guilds/guild-1/audit-log",
        params: { action: "UPDATE", resourceType: "GUILD_SETTINGS", q: "server" }

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body.fetch("entries").length).to eq(1)
      expect(response.parsed_body.fetch("entries").first).to include(
        "action" => "UPDATE",
        "resourceType" => "GUILD_SETTINGS",
        "resourceName" => "Server Settings"
      )
    end

    it "supports server-side pagination" do
      30.times do |index|
        create_history!(
          created_at: Time.zone.parse("2026-04-28T12:00:#{index.to_s.rjust(2, '0')}Z"),
          resource_name: "entry-#{index}"
        )
      end

      authenticate!
      get "/guilds/guild-1/audit-log", params: { page: 2, pageSize: 10 }

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to include(
        "page" => 2,
        "pageSize" => 10,
        "total" => 30,
        "totalPages" => 3
      )
      expect(response.parsed_body.fetch("entries").length).to eq(10)
    end

    it "returns unauthorized without a session" do
      get "/guilds/guild-1/audit-log"

      expect(response).to have_http_status(:unauthorized)
    end

    it "returns not found for an inaccessible guild" do
      authenticate!
      get "/guilds/guild-2/audit-log"

      expect(response).to have_http_status(:not_found)
    end
  end
end
