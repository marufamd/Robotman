require_relative "boot"

require "rails"
require "active_model/railtie"
require "active_job/railtie"
require "active_record/railtie"
require "action_controller/railtie"
require "action_mailer/railtie"
require "action_view/railtie"
require "rack/cors"

Bundler.require(*Rails.groups)

module RobotmanApi
  class Application < Rails::Application
    config.load_defaults 6.1
    config.api_only = true
    config.eager_load = false
    config.autoload_paths << Rails.root.join("app/services")
    config.autoload_paths << Rails.root.join("lib")

    config.session_store(
      :cookie_store,
      key: ENV.fetch("SESSION_COOKIE_KEY", "_robotman_api_session"),
      httponly: true,
      same_site: :lax,
      secure: ENV.fetch("SESSION_COOKIE_SECURE", "false") == "true"
    )

    config.middleware.use ActionDispatch::Cookies
    config.middleware.use config.session_store, config.session_options
  end
end
