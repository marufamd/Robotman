class AutoResponse < ApplicationRecord
  self.table_name = "auto_responses"
  self.inheritance_column = :_type_disabled

  attribute :aliases, :string, array: true, default: -> { [] }
  attribute :wildcard, :boolean, default: false
  attribute :embed, :boolean, default: false

  validates :guild, presence: true
  validates :name, presence: true, uniqueness: { scope: :guild }
  validates :type, presence: true
  validates :content, presence: true
  validates :author, presence: true
  validates :author_username, presence: true
end
