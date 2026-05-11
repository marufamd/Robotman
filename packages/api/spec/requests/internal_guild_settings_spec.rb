require "rails_helper"

RSpec.describe "InternalGuildSettings", type: :request do
  around do |example|
    original_token = ENV["INTERNAL_SERVICE_TOKEN"]
    ENV["INTERNAL_SERVICE_TOKEN"] = "internal-token"
    example.run
    ENV["INTERNAL_SERVICE_TOKEN"] = original_token
  end

  before do
    GuildSetting.delete_all
  end

  def internal_headers(token = "internal-token")
    {
      "X-Internal-Service-Token" => token
    }
  end

  it "returns guild settings snapshot ordered by guild id" do
    GuildSetting.create!(
      guild: "guild-2",
      prefix: nil,
      is_ranking_enabled: true,
      audit_log_channel_id: nil
    )
    GuildSetting.create!(
      guild: "guild-1",
      prefix: "!",
      is_ranking_enabled: false,
      audit_log_channel_id: "channel-1"
    )

    get "/internal/guild-settings/cache-snapshot", headers: internal_headers

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body).to eq(
      "guilds" => [
        {
          "guildId" => "guild-1",
          "isRankingEnabled" => false,
          "prefix" => "!"
        },
        {
          "guildId" => "guild-2",
          "isRankingEnabled" => true,
          "prefix" => nil
        }
      ]
    )
  end

  it "rejects missing internal token" do
    get "/internal/guild-settings/cache-snapshot"

    expect(response).to have_http_status(:unauthorized)
  end

  it "rejects invalid internal token" do
    get "/internal/guild-settings/cache-snapshot", headers: internal_headers("wrong-token")

    expect(response).to have_http_status(:unauthorized)
  end
end
