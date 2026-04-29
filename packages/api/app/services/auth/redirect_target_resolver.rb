require "uri"

module Auth
  class RedirectTargetResolver
    def self.call(origin:, dashboard_url:)
      new(origin: origin, dashboard_url: dashboard_url).call
    end

    def initialize(origin:, dashboard_url:)
      @origin = origin
      @dashboard_url = dashboard_url
    end

    def call
      return default_target if origin.to_s.strip.empty?

      parsed_origin = URI.parse(origin)
      parsed_dashboard = URI.parse(dashboard_url)

      same_origin =
        parsed_origin.scheme == parsed_dashboard.scheme &&
        parsed_origin.host == parsed_dashboard.host &&
        parsed_origin.port == parsed_dashboard.port

      return default_target unless same_origin

      "#{dashboard_url}#{parsed_origin.path.presence || '/guilds'}#{query_string(parsed_origin)}"
    rescue URI::InvalidURIError
      default_target
    end

    private

    attr_reader :origin, :dashboard_url

    def default_target
      "#{dashboard_url}/guilds"
    end

    def query_string(uri)
      uri.query.present? ? "?#{uri.query}" : ""
    end
  end
end
