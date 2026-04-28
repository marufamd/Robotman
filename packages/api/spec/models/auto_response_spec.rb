require "rails_helper"

RSpec.describe AutoResponse, type: :model do
  subject(:auto_response) do
    described_class.new(
      guild: "guild-1",
      name: "welcome",
      type: "text",
      content: "Hello there",
      author: "user-1",
      author_username: "robotman"
    )
  end

  it "requires guild and name" do
    auto_response.guild = nil
    auto_response.name = nil

    expect(auto_response).not_to be_valid
    expect(auto_response.errors[:guild]).to include("can't be blank")
    expect(auto_response.errors[:name]).to include("can't be blank")
  end

  it "requires all other non-null fields" do
    auto_response.type = nil
    auto_response.content = nil
    auto_response.author = nil
    auto_response.author_username = nil

    expect(auto_response).not_to be_valid
    expect(auto_response.errors[:type]).to include("can't be blank")
    expect(auto_response.errors[:content]).to include("can't be blank")
    expect(auto_response.errors[:author]).to include("can't be blank")
    expect(auto_response.errors[:author_username]).to include("can't be blank")
  end

  it "rejects duplicate names within the same guild" do
    described_class.create!(auto_response.attributes)
    duplicate = described_class.new(auto_response.attributes)

    expect(duplicate).not_to be_valid
    expect(duplicate.errors[:name]).to include("has already been taken")
  end

  it "allows the same name in different guilds" do
    described_class.create!(auto_response.attributes)
    other_guild = described_class.new(auto_response.attributes.merge(guild: "guild-2"))

    expect(other_guild).to be_valid
  end

  it "initializes aliases, wildcard, and embed with schema defaults" do
    fresh_record = described_class.new

    expect(fresh_record.aliases).to eq([])
    expect(fresh_record.wildcard).to be(false)
    expect(fresh_record.embed).to be(false)
  end

  it "persists and reads the type column without STI behavior" do
    record = described_class.create!(auto_response.attributes)

    expect(record.reload.type).to eq("text")
  end
end
