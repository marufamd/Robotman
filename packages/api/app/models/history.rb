class History < ApplicationRecord
  self.table_name = "history"

  validates :guild, presence: true
  validates :user_id, presence: true
  validates :user_username, presence: true
  validates :action, presence: true
  validates :resource_type, presence: true
end
