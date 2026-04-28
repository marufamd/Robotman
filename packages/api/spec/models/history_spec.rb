require "rails_helper"

RSpec.describe History, type: :model do
  subject(:history) do
    described_class.new(
      guild: "guild-1",
      user_id: "user-1",
      user_username: "robotman",
      action: "CREATE",
      resource_type: "AUTO_RESPONSE"
    )
  end

  it "requires all non-null fields" do
    history.guild = nil
    history.user_id = nil
    history.user_username = nil
    history.action = nil
    history.resource_type = nil

    expect(history).not_to be_valid
    expect(history.errors[:guild]).to include("can't be blank")
    expect(history.errors[:user_id]).to include("can't be blank")
    expect(history.errors[:user_username]).to include("can't be blank")
    expect(history.errors[:action]).to include("can't be blank")
    expect(history.errors[:resource_type]).to include("can't be blank")
  end

  it "accepts structured JSONB changes content" do
    history.changes = {
      before: { content: "old" },
      after: { content: "new" }
    }

    expect(history).to be_valid
    expect(history.changes).to eq(
      "before" => { "content" => "old" },
      "after" => { "content" => "new" }
    )
  end
end
