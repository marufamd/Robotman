class GuildSetting < ApplicationRecord
  self.table_name = "guild_settings"
  self.primary_key = "guild"

  attribute :prefix, :string
  attribute :is_ranking_enabled, :boolean, default: false

  validates :guild, presence: true
  validates :prefix, length: { maximum: 15 }, allow_blank: true
end
