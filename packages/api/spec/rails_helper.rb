require "spec_helper"
require "active_record"

models_path = File.expand_path("../app/models", __dir__)
$LOAD_PATH.unshift(models_path) unless $LOAD_PATH.include?(models_path)

require "application_record"
require "auto_response"
require "history"
require "guild_setting"
require "rank"

services_path = File.expand_path("../app/services", __dir__)
$LOAD_PATH.unshift(services_path) unless $LOAD_PATH.include?(services_path)

require "rabbitmq/dashboard_event_publisher"
