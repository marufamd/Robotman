require "rails_helper"

RSpec.describe "Guilds", type: :request do
  let(:client) { instance_double(Discord::OauthClient) }
  let(:csrf_token) do
    get "/csrf"
    response.parsed_body.fetch("csrfToken")
  end

  before do
    allow(Discord::OauthClient).to receive(:new).and_return(client)
    allow(client).to receive(:authorization_url).and_return("https://discord.com/oauth2/authorize?state=known-state")
    allow(client).to receive(:exchange_code_for_token).and_return("access_token" => "user-token")
    allow(client).to receive(:fetch_current_user).and_return(
      "id" => "user-1",
      "username" => "robotman",
      "global_name" => "Robotman",
      "avatar" => nil
    )
    allow(SecureRandom).to receive(:hex).and_return("known-state")
  end

  it "returns only guilds the user can manage in dashboard shape" do
    allow(client).to receive(:fetch_current_guilds).with("user-token").and_return(
      [
        {
          "id" => "guild-1",
          "name" => "Owned Guild",
          "icon" => "icon-1",
          "owner" => true,
          "permissions" => "0"
        },
        {
          "id" => "guild-2",
          "name" => "Managed Guild",
          "icon" => nil,
          "owner" => false,
          "permissions" => "32"
        },
        {
          "id" => "guild-3",
          "name" => "Read Only Guild",
          "icon" => nil,
          "owner" => false,
          "permissions" => "0"
        }
      ]
    )

    post "/auth/discord", params: { authenticity_token: csrf_token }
    get "/auth/discord/callback", params: { code: "oauth-code", state: "known-state" }
    get "/guilds"

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body).to eq(
      [
        {
          "guildId" => "guild-1",
          "name" => "Owned Guild",
          "iconUrl" => "https://cdn.discordapp.com/icons/guild-1/icon-1.png?size=256",
          "isOwner" => true
        },
        {
          "guildId" => "guild-2",
          "name" => "Managed Guild",
          "iconUrl" => nil,
          "isOwner" => false
        }
      ]
    )
  end

  it "returns unauthorized without a session" do
    get "/guilds"

    expect(response).to have_http_status(:unauthorized)
  end
end
