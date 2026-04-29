require "rails_helper"

RSpec.describe "CSRF", type: :request do
  it "returns a form authenticity token" do
    get "/csrf"

    expect(response).to have_http_status(:ok)
    expect(response.parsed_body["csrfToken"]).to be_a(String)
    expect(response.parsed_body["csrfToken"]).not_to be_empty
  end
end
