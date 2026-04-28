class GuildSetting < ApplicationRecord
  self.table_name = "guild_settings"
  self.primary_key = "guild"

  attribute :is_ranking_enabled, :boolean, default: false

  validates :guild, presence: true
end
