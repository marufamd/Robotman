class AddColorAndDisplayNameToRanks < ActiveRecord::Migration[6.1]
  def change
    unless column_exists?(:ranks, :display_name)
      add_column :ranks, :display_name, :text, null: false, default: ""
    end

    unless column_exists?(:ranks, :color)
      add_column :ranks, :color, :integer
    end

    unless index_exists?(:ranks, [:guild, :score, :user_id], name: "idx_ranks_leaderboard")
      add_index :ranks, [:guild, :score, :user_id], order: { score: :desc }, name: "idx_ranks_leaderboard"
    end
  end
end
