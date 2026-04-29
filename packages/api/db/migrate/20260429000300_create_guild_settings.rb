class CreateGuildSettings < ActiveRecord::Migration[6.1]
  def change
    create_table :guild_settings, id: false do |t|
      t.text :guild, null: false, primary_key: true
      t.string :prefix, limit: 15
      t.boolean :is_ranking_enabled, null: false, default: false
      t.text :audit_log_channel_id
      t.timestamps
    end

    execute "ALTER TABLE guild_settings ADD PRIMARY KEY (guild);"
  end
end
