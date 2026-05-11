require "rails_helper"

RSpec.describe "InternalAutoResponses", type: :request do
  around do |example|
    original_token = ENV["INTERNAL_SERVICE_TOKEN"]
    ENV["INTERNAL_SERVICE_TOKEN"] = "internal-token"
    example.run
    ENV["INTERNAL_SERVICE_TOKEN"] = original_token
  end

  before do
    AutoResponse.delete_all
  end

  def internal_headers(token = "internal-token")
    {
      "X-Internal-Service-Token" => token
    }
  end

  def create_response!(guild:, name:, updated_at:, deleted_at: nil)
    response = AutoResponse.create!(
      guild: guild,
      name: name,
      type: "Regular",
      content: "hello #{name}",
      aliases: ["#{name}-alias"],
      author: "user-1",
      author_username: "Robotman",
      wildcard: name.include?("*"),
      embed: false,
      embed_color: nil
    )

    response.update_columns(updated_at: updated_at, deleted_at: deleted_at)
    response.reload
  end

  it "returns active auto-response snapshot grouped by guild" do
    guild_1_first = create_response!(
      guild: "guild-1",
      name: "alpha",
      updated_at: Time.zone.parse("2026-05-09T10:00:00Z")
    )
    guild_1_second = create_response!(
      guild: "guild-1",
      name: "beta*",
      updated_at: Time.zone.parse("2026-05-09T11:00:00Z")
    )
    create_response!(
      guild: "guild-2",
      name: "gamma",
      updated_at: Time.zone.parse("2026-05-09T12:00:00Z")
    )
    guild_2_response = AutoResponse.find_by!(guild: "guild-2", name: "gamma")

    get "/internal/auto-responses/cache-snapshot", headers: internal_headers

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body).to eq(
      "guilds" => [
        {
          "guildId" => "guild-1",
          "triggers" => [
            {
              "responseId" => guild_1_first.id,
              "name" => "alpha",
              "aliases" => ["alpha-alias"],
              "content" => "hello alpha",
              "wildcard" => false
            },
            {
              "responseId" => guild_1_second.id,
              "name" => "beta*",
              "aliases" => ["beta*-alias"],
              "content" => "hello beta*",
              "wildcard" => true
            }
          ]
        },
        {
          "guildId" => "guild-2",
          "triggers" => [
            {
              "responseId" => guild_2_response.id,
              "name" => "gamma",
              "aliases" => ["gamma-alias"],
              "content" => "hello gamma",
              "wildcard" => false
            }
          ]
        }
      ]
    )
  end

  it "excludes soft-deleted auto-responses" do
    create_response!(
      guild: "guild-1",
      name: "active",
      updated_at: Time.zone.parse("2026-05-09T10:00:00Z")
    )
    create_response!(
      guild: "guild-1",
      name: "deleted",
      updated_at: Time.zone.parse("2026-05-09T11:00:00Z"),
      deleted_at: Time.zone.parse("2026-05-09T12:00:00Z")
    )

    get "/internal/auto-responses/cache-snapshot", headers: internal_headers

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body["guilds"]).to match(
      [
        {
          "guildId" => "guild-1",
          "triggers" => [
            a_hash_including("name" => "active")
          ]
        }
      ]
    )
  end

  it "rejects missing internal token" do
    get "/internal/auto-responses/cache-snapshot"

    expect(response).to have_http_status(:unauthorized)
  end

  it "rejects invalid internal token" do
    get "/internal/auto-responses/cache-snapshot", headers: internal_headers("wrong-token")

    expect(response).to have_http_status(:unauthorized)
  end
end
