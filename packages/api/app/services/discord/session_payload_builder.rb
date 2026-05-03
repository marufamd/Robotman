module Discord
  class SessionPayloadBuilder
    def self.call(user_payload)
      avatar_hash = user_payload["avatar"]
      user_id = user_payload.fetch("id")
      username = user_payload.fetch("username")
      display_name = user_payload["global_name"].presence || username

      {
        userId: user_id,
        username: username,
        displayName: display_name,
        avatarUrl: avatar_hash.present? ? "https://cdn.discordapp.com/avatars/#{user_id}/#{avatar_hash}.png?size=256" : nil
      }
    end
  end
end
