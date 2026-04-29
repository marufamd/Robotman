require "rails_helper"

RSpec.describe Auth::RedirectTargetResolver do
  it "returns a same-origin redirect target when valid" do
    result = described_class.call(
      origin: "http://localhost:3000/guilds/guild-1/settings?tab=prefix",
      dashboard_url: "http://localhost:3000"
    )

    expect(result).to eq("http://localhost:3000/guilds/guild-1/settings?tab=prefix")
  end

  it "falls back to /guilds when the origin is on another host" do
    result = described_class.call(
      origin: "https://evil.example.com/phish",
      dashboard_url: "http://localhost:3000"
    )

    expect(result).to eq("http://localhost:3000/guilds")
  end
end
