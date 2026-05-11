class Rank < ApplicationRecord
  self.table_name = "ranks"
  self.primary_key = [:guild, :user_id]

  attribute :color, :integer
  attribute :display_name, :string, default: ""
  attribute :score, :integer, default: 0

  validates :guild, presence: true
  validates :user_id, presence: true
  validates :display_name, length: { maximum: 100 }
  validates :color,
    numericality: {
      greater_than_or_equal_to: 0,
      less_than_or_equal_to: 0xFFFFFF,
      only_integer: true
    },
    allow_nil: true
end
