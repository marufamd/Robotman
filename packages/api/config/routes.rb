Rails.application.routes.draw do
  get "/csrf", to: "csrf#show"
  post "/auth/discord", to: "sessions#start"
  get "/auth/discord/callback", to: "sessions#create"
  get "/auth/failure", to: "sessions#failure"
  get "/session", to: "sessions#show"
  delete "/session", to: "sessions#destroy"
  get "/guilds", to: "guilds#index"
end
