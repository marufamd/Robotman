class CreateRanks < ActiveRecord::Migration[6.1]
  def change
    create_table :ranks, id: false, if_not_exists: true do |t|
      t.text :guild, null: false
      t.text :user_id, null: false
      t.integer :score, default: 0
      t.datetime :last_message_at
    end

    return if composite_primary_key_exists?(:ranks, %w[guild user_id])

    execute "ALTER TABLE ranks ADD PRIMARY KEY (guild, user_id);"
  end

  private

  def composite_primary_key_exists?(table_name, columns)
    normalized_columns = Array(columns).map(&:to_s).sort

    result = connection.select_value(<<~SQL.squish)
      SELECT 1
      FROM pg_constraint
      WHERE contype = 'p'
        AND conrelid = #{connection.quote(table_name.to_s)}::regclass
        AND (
          SELECT array_agg(att.attname ORDER BY att.attname)
          FROM unnest(conkey) AS colnum
          JOIN pg_attribute att
            ON att.attrelid = conrelid
           AND att.attnum = colnum
        ) = ARRAY[#{normalized_columns.map { |column| connection.quote(column) }.join(', ')}]::name[]
      LIMIT 1
    SQL

    result.present?
  end
end
