require "active_support/core_ext/integer/time"

Rails.application.configure do
  config.cache_classes = false
  config.eager_load = false
  config.consider_all_requests_local = true
  config.action_controller.perform_caching = false
  config.active_support.deprecation = :log

  ENV.fetch("ALLOWED_HOSTS", "api").split(",").map(&:strip).reject(&:empty?).each do |host|
    config.hosts << host
  end
end
