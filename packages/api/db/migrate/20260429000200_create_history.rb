class CreateHistory < ActiveRecord::Migration[6.1]
  def change
    create_table :history, id: :uuid do |t|
      t.text :guild, null: false
      t.text :user_id, null: false
      t.text :user_username, null: false
      t.text :action, null: false
      t.text :resource_type, null: false
      t.text :resource_id
      t.text :resource_name
      t.jsonb :changes
      t.timestamps
    end

    add_index :history, :guild
    add_index :history, %i[resource_type resource_id], name: "idx_history_resource"
  end
end
