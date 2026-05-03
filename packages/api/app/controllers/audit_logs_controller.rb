class AuditLogsController < ApplicationController
  AUDIT_LOG_ACTIONS = %w[CREATE UPDATE DELETE TOGGLE].freeze
  AUDIT_LOG_RESOURCE_TYPES = %w[AUTO_RESPONSE GUILD_SETTINGS].freeze
  DEFAULT_PAGE = 1
  DEFAULT_PAGE_SIZE = 25
  MAX_PAGE_SIZE = 100

  before_action :authenticate_session!
  before_action :ensure_guild_access!

  def index
    page = current_page
    page_size = current_page_size
    connection = ActiveRecord::Base.connection
    where_sql = filtered_where_sql(connection)
    total = connection.select_value(count_sql(where_sql)).to_i
    total_pages = [1, (total.to_f / page_size).ceil].max

    entries = connection.select_all(entries_sql(where_sql, page: page, page_size: page_size))

    render json: {
      entries: entries.map { |entry| serialize_entry(entry) },
      page: page,
      pageSize: page_size,
      total: total,
      totalPages: total_pages
    }
  end

  private

  def guild_id
    params[:guild_id].to_s
  end

  def filtered_where_sql(connection)
    clauses = ["guild = #{connection.quote(guild_id)}"]

    if AUDIT_LOG_ACTIONS.include?(params[:action].to_s)
      clauses << "action = #{connection.quote(params[:action].to_s)}"
    end

    if AUDIT_LOG_RESOURCE_TYPES.include?(params[:resourceType].to_s)
      clauses << "resource_type = #{connection.quote(params[:resourceType].to_s)}"
    end

    if params[:q].present?
      query = "%#{ActiveRecord::Base.sanitize_sql_like(params[:q].to_s.strip)}%"
      quoted_query = connection.quote(query)
      clauses << "(user_username ILIKE #{quoted_query} OR resource_name ILIKE #{quoted_query})"
    end

    clauses.join(" AND ")
  end

  def count_sql(where_sql)
    <<~SQL.squish
      SELECT COUNT(*)
      FROM history
      WHERE #{where_sql}
    SQL
  end

  def entries_sql(where_sql, page:, page_size:)
    offset = (page - 1) * page_size

    <<~SQL.squish
      SELECT id, guild, user_id, user_username, action, resource_type, resource_id, resource_name, changes, created_at
      FROM history
      WHERE #{where_sql}
      ORDER BY created_at DESC
      LIMIT #{Integer(page_size)}
      OFFSET #{Integer(offset)}
    SQL
  end

  def current_page
    [params[:page].to_i, DEFAULT_PAGE].max
  end

  def current_page_size
    requested_page_size = params[:pageSize].to_i
    return DEFAULT_PAGE_SIZE if requested_page_size <= 0

    [requested_page_size, MAX_PAGE_SIZE].min
  end

  def serialize_entry(entry)
    parsed_changes = entry["changes"].present? ? JSON.parse(entry["changes"]) : nil

    {
      id: entry["id"],
      guildId: entry["guild"],
      userId: entry["user_id"],
      userUsername: entry["user_username"],
      action: entry["action"],
      resourceType: entry["resource_type"],
      resourceId: entry["resource_id"].presence,
      resourceName: entry["resource_name"].presence,
      changes: parsed_changes,
      createdAt: Time.zone.parse(entry["created_at"].to_s).iso8601
    }
  end

  def ensure_guild_access!
    return if current_accessible_guild_ids.include?(guild_id)

    render json: { message: "Guild not found" }, status: :not_found
  end
end
