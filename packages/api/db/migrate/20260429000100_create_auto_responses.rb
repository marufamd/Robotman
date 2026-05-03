class CreateAutoResponses < ActiveRecord::Migration[6.1]
  def change
    create_table :auto_responses, id: :uuid, if_not_exists: true do |t|
      t.text :guild, null: false
      t.text :name, null: false
      t.text :type, null: false
      t.text :content, null: false
      t.text :aliases, array: true, default: []
      t.text :author, null: false
      t.text :author_username, null: false
      t.text :editor
      t.text :editor_username
      t.boolean :wildcard, null: false, default: false
      t.boolean :embed, null: false, default: false
      t.integer :embed_color
      t.datetime :deleted_at
      t.timestamps
    end

    add_index :auto_responses, %i[guild name], unique: true, if_not_exists: true
  end
end
