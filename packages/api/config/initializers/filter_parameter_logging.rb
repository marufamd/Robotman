Rails.application.config.filter_parameters += %i[
  code
  state
  access_token
  refresh_token
  discord_client_secret
]
