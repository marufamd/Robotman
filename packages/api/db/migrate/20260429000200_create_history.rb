class CreateHistory < ActiveRecord::Migration[6.1]
  def change
    create_table :history, id: :uuid, if_not_exists: true do |t|
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

    add_index :history, :guild, if_not_exists: true
    add_index :history, %i[resource_type resource_id], name: "idx_history_resource", if_not_exists: true
  end
end
