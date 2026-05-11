require "rails_helper"

RSpec.describe Rank, type: :model do
  it "uses a composite primary key" do
    expect(described_class.primary_key).to eq(%w[guild user_id])
  end

  it "requires guild and user_id" do
    record = described_class.new

    expect(record).not_to be_valid
    expect(record.errors[:guild]).to include("can't be blank")
    expect(record.errors[:user_id]).to include("can't be blank")
  end

  it "defaults score to 0" do
    expect(described_class.new.score).to eq(0)
  end

  it "defaults display_name to an empty string" do
    expect(described_class.new.display_name).to eq("")
  end

  it "allows nil colors and accepts colors in rgb integer range" do
    expect(described_class.new(guild: "guild-1", user_id: "user-1", color: nil)).to be_valid
    expect(described_class.new(guild: "guild-1", user_id: "user-1", color: 0xFFFFFF)).to be_valid
  end

  it "rejects out-of-range colors" do
    record = described_class.new(guild: "guild-1", user_id: "user-1", color: 0x1000000)

    expect(record).not_to be_valid
    expect(record.errors[:color]).to be_present
  end
end
