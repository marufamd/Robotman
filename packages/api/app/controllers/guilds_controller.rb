class GuildsController < ApplicationController
  before_action :authenticate_session!

  def index
    return if performed?

    render json: current_dashboard_guilds
  end
end
