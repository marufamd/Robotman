require "rails_helper"

RSpec.describe "AutoResponses", type: :request do
  let(:client) { instance_double(Discord::OauthClient) }
  let(:publisher) { instance_double(Rabbitmq::DashboardEventPublisher, publish_response_updated!: true) }
  let(:csrf_token) do
    get "/csrf"
    response.parsed_body.fetch("csrfToken")
  end
  let(:headers) do
    {
      "CONTENT_TYPE" => "application/json",
      "X-CSRF-Token" => csrf_token
    }
  end

  before do
    Rails.cache.clear
    AutoResponse.delete_all
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

  def create_response!(name: "welcome", updated_at: nil)
    response = AutoResponse.create!(
      guild: "guild-1",
      name: name,
      type: "Regular",
      content: "hello",
      aliases: ["hi"],
      author: "user-1",
      author_username: "Robotman",
      wildcard: false,
      embed: true,
      embed_color: 16_747_575
    )

    response.update_columns(updated_at: updated_at) if updated_at
    response.reload
  end

  describe "GET /guilds/:guild_id/auto-responses" do
    it "returns responses ordered by updated_at desc" do
      older = create_response!(name: "older", updated_at: Time.zone.parse("2026-04-28T10:00:00Z"))
      newer = create_response!(name: "newer", updated_at: Time.zone.parse("2026-04-28T12:00:00Z"))

      authenticate!
      get "/guilds/guild-1/auto-responses"

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body.map { |item| item["id"] }).to eq([newer.id, older.id])
      expect(response.parsed_body.first).to include(
        "guildId" => "guild-1",
        "name" => "newer",
        "trigger" => "newer",
        "type" => "Regular",
        "content" => "hello",
        "aliases" => ["hi"],
        "wildcard" => false,
        "embed" => true,
        "embedColor" => 16_747_575,
        "createdBy" => "Robotman",
        "lastEditedBy" => nil
      )
    end

    it "returns unauthorized without session" do
      get "/guilds/guild-1/auto-responses"

      expect(response).to have_http_status(:unauthorized)
    end

    it "returns not found for inaccessible guild" do
      authenticate!
      get "/guilds/guild-2/auto-responses"

      expect(response).to have_http_status(:not_found)
    end
  end

  describe "POST /guilds/:guild_id/auto-responses" do
    it "creates response and publishes CREATE event with traceparent" do
      authenticate!

      post "/guilds/guild-1/auto-responses",
        params: {
          guildId: "ignored",
          trigger: "welcome",
          type: "Regular",
          content: "hello",
          aliases: ["hi", " hey "],
          wildcard: false,
          embed: true,
          embedColor: 16_747_575
        }.to_json,
        headers: headers.merge("traceparent" => "00-abc-def-01")

      expect(response).to have_http_status(:created)
      created = AutoResponse.find_by!(guild: "guild-1", name: "welcome")
      expect(created).to have_attributes(
        author: "user-1",
        author_username: "Robotman",
        editor: nil,
        editor_username: nil,
        aliases: ["hi", "hey"]
      )
      expect(response.parsed_body).to include(
        "id" => created.id,
        "guildId" => "guild-1",
        "name" => "welcome",
        "trigger" => "welcome",
        "createdBy" => "Robotman",
        "lastEditedBy" => nil
      )
      expect(publisher).to have_received(:publish_response_updated!).with(
        guild_id: "guild-1",
        action: "CREATE",
        response_id: created.id,
        data: {
          name: "welcome",
          type: "Regular",
          content: "hello",
          aliases: ["hi", "hey"],
          wildcard: false,
          embed: true,
          embed_color: 16_747_575
        },
        traceparent: "00-abc-def-01"
      )
      expect(History.last).to have_attributes(
        guild: "guild-1",
        user_id: "user-1",
        user_username: "Robotman",
        action: "CREATE",
        resource_type: "AUTO_RESPONSE",
        resource_id: created.id,
        resource_name: "welcome"
      )
      expect(History.last[:changes]).to eq(
        "after" => {
          "trigger" => "welcome",
          "type" => "Regular",
          "content" => "hello",
          "aliases" => ["hi", "hey"],
          "wildcard" => false,
          "embed" => true,
          "embedColor" => 16_747_575
        }
      )
    end
  end

  describe "PATCH /guilds/:guild_id/auto-responses/:id" do
    it "updates response and publishes UPDATE event" do
      auto_response = create_response!
      authenticate!

      patch "/guilds/guild-1/auto-responses/#{auto_response.id}",
        params: {
          trigger: "welcome-back",
          type: "Moderator",
          content: "updated",
          aliases: ["updated"],
          wildcard: true,
          embed: false,
          embedColor: 255
        }.to_json,
        headers: headers.merge("traceparent" => "00-upd-def-01")

      expect(response).to have_http_status(:ok)
      auto_response.reload
      expect(auto_response).to have_attributes(
        name: "welcome-back",
        type: "Moderator",
        content: "updated",
        aliases: ["updated"],
        wildcard: true,
        embed: false,
        embed_color: 255,
        editor: "user-1",
        editor_username: "Robotman"
      )
      expect(publisher).to have_received(:publish_response_updated!).with(
        guild_id: "guild-1",
        action: "UPDATE",
        response_id: auto_response.id,
        data: {
          name: "welcome-back",
          type: "Moderator",
          content: "updated",
          aliases: ["updated"],
          wildcard: true,
          embed: false,
          embed_color: 255
        },
        traceparent: "00-upd-def-01"
      )
      expect(History.last).to have_attributes(
        action: "UPDATE",
        resource_type: "AUTO_RESPONSE",
        resource_id: auto_response.id,
        resource_name: "welcome-back"
      )
      expect(History.last[:changes]).to eq(
        "before" => {
          "trigger" => "welcome",
          "type" => "Regular",
          "content" => "hello",
          "aliases" => ["hi"],
          "wildcard" => false,
          "embed" => true,
          "embedColor" => 16_747_575
        },
        "after" => {
          "trigger" => "welcome-back",
          "type" => "Moderator",
          "content" => "updated",
          "aliases" => ["updated"],
          "wildcard" => true,
          "embed" => false,
          "embedColor" => 255
        }
      )
    end

    it "rejects invalid enum values" do
      auto_response = create_response!
      authenticate!

      patch "/guilds/guild-1/auto-responses/#{auto_response.id}",
        params: {
          trigger: "welcome-back",
          type: "regex",
          content: "updated",
          aliases: ["updated"],
          wildcard: true,
          embed: false,
          embedColor: 255
        }.to_json,
        headers: headers

      expect(response).to have_http_status(:unprocessable_entity)
      expect(response.parsed_body["message"]).to match(/Type is not included in the list/i)
    end

    it "returns not found for response outside guild" do
      auto_response = create_response!
      authenticate!

      patch "/guilds/guild-2/auto-responses/#{auto_response.id}",
        params: { name: "nope" }.to_json,
        headers: headers

      expect(response).to have_http_status(:not_found)
    end
  end

  describe "DELETE /guilds/:guild_id/auto-responses/:id" do
    it "destroys response and publishes DELETE event" do
      auto_response = create_response!
      authenticate!

      delete "/guilds/guild-1/auto-responses/#{auto_response.id}",
        headers: headers.merge("traceparent" => "00-del-def-01")

      expect(response).to have_http_status(:no_content)
      expect(AutoResponse.find_by(id: auto_response.id)).to be_nil
      expect(publisher).to have_received(:publish_response_updated!).with(
        guild_id: "guild-1",
        action: "DELETE",
        response_id: auto_response.id,
        traceparent: "00-del-def-01"
      )
      expect(History.last).to have_attributes(
        action: "DELETE",
        resource_type: "AUTO_RESPONSE",
        resource_id: auto_response.id,
        resource_name: "welcome"
      )
      expect(History.last[:changes]).to eq(
        "before" => {
          "trigger" => "welcome",
          "type" => "Regular",
          "content" => "hello",
          "aliases" => ["hi"],
          "wildcard" => false,
          "embed" => true,
          "embedColor" => 16_747_575
        }
      )
    end

    it "returns not found for missing response" do
      authenticate!

      delete "/guilds/guild-1/auto-responses/#{SecureRandom.uuid}",
        headers: headers

      expect(response).to have_http_status(:not_found)
    end
  end
end
