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
end
