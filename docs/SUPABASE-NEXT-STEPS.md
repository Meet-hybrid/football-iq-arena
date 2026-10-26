# Supabase: next implementation step

## Why we are adding it

The current multiplayer room server keeps rooms, players, and chat in Render memory. That is fast, but rooms disappear when the server restarts or sleeps. Supabase will provide persistent storage for rooms, teams, match state, and chat.

## Architecture

```text
Vercel frontend → Render API → Supabase Database
```

The frontend will continue calling the Render API. Supabase credentials must stay on Render and must never be exposed in Vercel frontend variables or browser code.

## Supabase products

- **Database:** rooms, players, teams, match state, chat, and match history.
- **Realtime:** optional replacement for polling room updates and chat.
- **Storage:** only for files such as avatars or audio assets; it is not the right place for live room state.

## Render environment variables

Add these to the Render backend service:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Never commit these values or place the service-role key in frontend environment variables.

## Performance expectations

Supabase should be fast enough for quiz rooms and chat when Render and Supabase use the same region. Typical database requests should take tens to a few hundred milliseconds. Render free-tier cold starts can still take 10–60 seconds after inactivity.

To keep the game responsive:

1. Keep active game state small.
2. Use Realtime for chat and room updates instead of frequent polling.
3. Use WebRTC directly between players for voice; do not send voice through Supabase.
4. Keep stored questions available locally during matches.
5. Use Claude for answer judging and optional question generation, not for every screen action.

## Implementation order

1. Create the Supabase project and database tables.
2. Add the server-only Supabase client to Render.
3. Move room creation, joining, teams, and chat from memory to Supabase.
4. Persist match state and reconnect sessions after refreshes.
5. Add Realtime subscriptions for room and chat updates.
6. Add WebRTC voice chat with mute and push-to-talk controls.
7. Test reconnects, Render restarts, mobile devices, and multiplayer latency.

## Current status

- Cross-device rooms: implemented, currently in-memory.
- Team assignment: implemented.
- Room chat: implemented.
- Private teammate chat: implemented server-side by team.
- Persistent Supabase storage: next task.
- Voice chat: after persistence and team connectivity are stable.
