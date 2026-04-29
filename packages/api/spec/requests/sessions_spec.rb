require "rails_helper"

RSpec.describe "Sessions", type: :request do
  let(:client) { instance_double(Discord::OauthClient) }
  let(:csrf_token) do
    get "/csrf"
    response.parsed_body.fetch("csrfToken")
  end

  before do
    allow(Discord::OauthClient).to receive(:new).and_return(client)
    allow(SecureRandom).to receive(:hex).and_return("known-state")
  end

  describe "POST /auth/discord" do
    it "starts the OAuth flow and redirects to Discord" do
      allow(client).to receive(:authorization_url).and_return("https://discord.com/oauth2/authorize?state=known-state")

      post "/auth/discord", params: {
        authenticity_token: csrf_token,
        origin: "http://localhost:3000/guilds/guild-1/settings"
      }

      expect(response).to redirect_to("https://discord.com/oauth2/authorize?state=known-state")
    end
  end

  describe "GET /auth/discord/callback" do
    before do
      allow(client).to receive(:authorization_url).and_return("https://discord.com/oauth2/authorize?state=known-state")
      allow(client).to receive(:exchange_code_for_token).and_return(
        "access_token" => "user-token"
      )
      allow(client).to receive(:fetch_current_user).and_return(
        "id" => "user-1",
        "username" => "robotman",
        "global_name" => "Robotman",
        "avatar" => "avatar-hash"
      )
    end

    it "creates an encrypted session and redirects to the dashboard" do
      post "/auth/discord", params: { authenticity_token: csrf_token }
      get "/auth/discord/callback", params: { code: "oauth-code", state: "known-state" }

      expect(response).to redirect_to("http://localhost:3000/guilds")

      get "/session"

      expect(response).to have_http_status(:ok)
      expect(response.parsed_body).to eq(
        "userId" => "user-1",
        "username" => "Robotman",
        "avatarUrl" => "https://cdn.discordapp.com/avatars/user-1/avatar-hash.png?size=256"
      )
    end

    it "redirects to the login page with an error when state is invalid" do
      post "/auth/discord", params: { authenticity_token: csrf_token }
      get "/auth/discord/callback", params: { code: "oauth-code", state: "wrong-state" }

      expect(response).to redirect_to("http://localhost:3000/login?error=invalid_state")
    end
  end

  describe "GET /session" do
    it "returns unauthorized without a session" do
      get "/session"

      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "DELETE /session" do
    it "clears the session" do
      allow(client).to receive(:authorization_url).and_return("https://discord.com/oauth2/authorize?state=known-state")
      allow(client).to receive(:exchange_code_for_token).and_return("access_token" => "user-token")
      allow(client).to receive(:fetch_current_user).and_return(
        "id" => "user-1",
        "username" => "robotman",
        "global_name" => "Robotman",
        "avatar" => nil
      )

      post "/auth/discord", params: { authenticity_token: csrf_token }
      get "/auth/discord/callback", params: { code: "oauth-code", state: "known-state" }

      delete "/session", params: { authenticity_token: csrf_token }

      expect(response).to have_http_status(:no_content)

      get "/session"
      expect(response).to have_http_status(:unauthorized)
    end
  end

  describe "GET /auth/failure" do
    it "redirects back to the dashboard login page" do
      get "/auth/failure", params: { message: "access_denied" }

      expect(response).to redirect_to("http://localhost:3000/login?error=access_denied")
    end
  end
end
