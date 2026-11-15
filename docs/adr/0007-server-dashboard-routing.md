# Server dashboard routes and navigation

The dashboard separates server selection from server management: `/servers` lists manageable servers, and `/servers/:serverId` opens the selected server overview with feature pages beneath it. A persistent sidebar and top bar follow the `robot-next` dashboard pattern, giving managers stable links to Responses, Recommendations, Response History, and Server Settings; the route structure makes each task directly addressable while keeping “server” in all user-facing URLs and navigation.
