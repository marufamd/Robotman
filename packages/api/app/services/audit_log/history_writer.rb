module AuditLog
  class HistoryWriter
    def self.record!(guild:, user_id:, user_username:, action:, resource_type:, resource_id:, resource_name:, before: nil, after: nil)
      payload = {}
      payload[:before] = deep_stringify(before) if before.present?
      payload[:after] = deep_stringify(after) if after.present?

      connection = ActiveRecord::Base.connection
      quoted_changes = payload.present? ? connection.quote(JSON.dump(payload)) : "NULL"

      connection.execute(<<~SQL.squish)
        INSERT INTO history (
          guild,
          user_id,
          user_username,
          action,
          resource_type,
          resource_id,
          resource_name,
          changes,
          created_at
        ) VALUES (
          #{connection.quote(guild)},
          #{connection.quote(user_id)},
          #{connection.quote(user_username)},
          #{connection.quote(action.to_s.upcase)},
          #{connection.quote(resource_type)},
          #{resource_id.present? ? connection.quote(resource_id) : "NULL"},
          #{resource_name.present? ? connection.quote(resource_name) : "NULL"},
          #{quoted_changes},
          CURRENT_TIMESTAMP
        )
      SQL
    end

    def self.deep_stringify(value)
      case value
      when Hash
        value.deep_stringify_keys.transform_values { |nested| deep_stringify(nested) }
      when Array
        value.map { |nested| deep_stringify(nested) }
      else
        value
      end
    end
  end
end
