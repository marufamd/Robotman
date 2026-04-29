require "json"
require "net/http"
require "uri"

module Discord
  class OauthClient
    AUTHORIZE_URL = "https://discord.com/oauth2/authorize".freeze
    TOKEN_URL = "https://discord.com/api/oauth2/token".freeze
    API_BASE_URL = "https://discord.com/api/v10".freeze

    class Error < StandardError; end

    def initialize(client_id:, client_secret:, http_client: Net::HTTP)
      @client_id = client_id
      @client_secret = client_secret
      @http_client = http_client
    end

    def authorization_url(state:, redirect_uri:)
      uri = URI.parse(AUTHORIZE_URL)
      uri.query = URI.encode_www_form(
        client_id: client_id,
        redirect_uri: redirect_uri,
        response_type: "code",
        scope: "identify guilds",
        state: state,
        prompt: "consent"
      )
      uri.to_s
    end

    def exchange_code_for_token(code:, redirect_uri:)
      uri = URI.parse(TOKEN_URL)
      request = Net::HTTP::Post.new(uri)
      request.set_form_data(
        client_id: client_id,
        client_secret: client_secret,
        grant_type: "authorization_code",
        code: code,
        redirect_uri: redirect_uri
      )

      perform_json_request(uri, request)
    end

    def fetch_current_user(access_token)
      get_json("/users/@me", access_token)
    end

    def fetch_current_guilds(access_token)
      get_json("/users/@me/guilds", access_token)
    end

    private

    attr_reader :client_id, :client_secret, :http_client

    def get_json(path, access_token)
      uri = URI.parse("#{API_BASE_URL}#{path}")
      request = Net::HTTP::Get.new(uri)
      request["Authorization"] = "Bearer #{access_token}"

      perform_json_request(uri, request)
    end

    def perform_json_request(uri, request)
      response =
        http_client.start(uri.host, uri.port, use_ssl: uri.scheme == "https") do |http|
          http.request(request)
        end

      parsed = JSON.parse(response.body)
      return parsed if response.is_a?(Net::HTTPSuccess)

      message = parsed["error_description"] || parsed["message"] || response.message
      raise Error, message
    rescue JSON::ParserError
      raise Error, "Unexpected Discord response"
    end
  end
end
