class CreateRanks < ActiveRecord::Migration[6.1]
  def change
    create_table :ranks, id: false do |t|
      t.text :guild, null: false
      t.text :user_id, null: false
      t.integer :score, default: 0
      t.datetime :last_message_at
    end

    execute "ALTER TABLE ranks ADD PRIMARY KEY (guild, user_id);"
  end
end
