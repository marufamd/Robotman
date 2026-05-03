require "rails_helper"

RSpec.describe Discord::OauthClient do
  let(:http_client) { class_double(Net::HTTP) }
  let(:http) { instance_double(Net::HTTP) }
  let(:client) do
    described_class.new(
      client_id: "client-id",
      client_secret: "client-secret",
      http_client: http_client
    )
  end

  before do
    allow(http_client).to receive(:start).and_yield(http)
  end

  it "retries once after a Discord 429 using retry_after" do
    limited = Net::HTTPTooManyRequests.new("1.1", "429", "Too Many Requests")
    allow(limited).to receive(:body).and_return('{"message":"rate limited","retry_after":0.25}')

    success = Net::HTTPOK.new("1.1", "200", "OK")
    allow(success).to receive(:body).and_return('{"id":"guild-1"}')

    expect(http).to receive(:request).twice.and_return(limited, success)
    expect(client).to receive(:sleep).with(0.25).once

    expect(client.fetch_current_guilds("token")).to eq("id" => "guild-1")
  end

  it "raises a rate-limited error when Discord keeps returning 429" do
    limited = Net::HTTPTooManyRequests.new("1.1", "429", "Too Many Requests")
    allow(limited).to receive(:body).and_return('{"message":"rate limited","retry_after":0.25}')

    expect(http).to receive(:request).twice.and_return(limited, limited)
    allow(client).to receive(:sleep)

    expect { client.fetch_current_guilds("token") }.to raise_error(
      Discord::OauthClient::RateLimited
    )
  end
end
