class Rank < ApplicationRecord
  self.table_name = "ranks"
  self.primary_key = [:guild, :user_id]

  attribute :score, :integer, default: 0

  validates :guild, presence: true
  validates :user_id, presence: true
end
