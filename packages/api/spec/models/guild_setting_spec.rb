require "rails_helper"

RSpec.describe GuildSetting, type: :model do
  it "uses guild as the primary key" do
    expect(described_class.primary_key).to eq("guild")
  end

  it "requires guild" do
    record = described_class.new

    expect(record).not_to be_valid
    expect(record.errors[:guild]).to include("can't be blank")
  end

  it "defaults is_ranking_enabled to false" do
    expect(described_class.new.is_ranking_enabled).to be(false)
  end
end
