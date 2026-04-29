require "rails_helper"

RSpec.describe Discord::GuildSummaryBuilder do
  it "filters non-manageable guilds and serializes dashboard fields" do
    result = described_class.call(
      [
        {
          "id" => "guild-1",
          "name" => "Owned Guild",
          "icon" => "icon-hash",
          "owner" => true,
          "permissions" => "0"
        },
        {
          "id" => "guild-2",
          "name" => "Managed Guild",
          "icon" => nil,
          "owner" => false,
          "permissions" => "32"
        },
        {
          "id" => "guild-3",
          "name" => "Read Only Guild",
          "icon" => nil,
          "owner" => false,
          "permissions" => "0"
        }
      ]
    )

    expect(result).to eq(
      [
        {
          guildId: "guild-1",
          name: "Owned Guild",
          iconUrl: "https://cdn.discordapp.com/icons/guild-1/icon-hash.png?size=256",
          isOwner: true
        },
        {
          guildId: "guild-2",
          name: "Managed Guild",
          iconUrl: nil,
          isOwner: false
        }
      ]
    )
  end
end
