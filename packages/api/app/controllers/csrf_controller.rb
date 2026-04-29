class CsrfController < ApplicationController
  def show
    render json: { csrfToken: form_authenticity_token }
  end
end
