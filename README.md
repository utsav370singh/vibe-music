# Vibe Music

A Next.js 16 + TypeScript music player with MongoDB-backed device sessions, likes, multiple playlists, playlist sharing, repeat modes, catalog pagination, and user moderation.

## Run on Windows in VS Code

1. Install Node.js 20 or newer and open this folder in VS Code.
2. Open **Terminal > New Terminal** and run:

   ```powershell
   npm install
   npm run db:generate
   npm run db:push
   npm run dev
   ```

3. Open <http://localhost:3000>.

For a production check, run `npm run build` and then `npm start`.

## Configuration

The app uses MongoDB Atlas through `DATABASE_URL`. Live values belong in `.env.local`, which is ignored by Git. The tracked `.env` contains safe local placeholders only. Set `ADMIN_USERNAME` and a strong `ADMIN_PASSWORD` in `.env.local` before deployment.

Podcast discovery requires free Podcast Index credentials in `PODCAST_INDEX_KEY` and `PODCAST_INDEX_SECRET`. Add the same variables to Vercel before deploying podcast search.

The Admin navigation is hidden for every ordinary user. Signing in or signing up with `ADMIN_USERNAME` triggers an additional password challenge. Only that verified session can see the dashboard or call its APIs.

Authentication for ordinary users is intentionally username-only, matching the product brief. A successful login creates a secure HTTP-only device cookie lasting 180 days, so the username is not requested repeatedly. For a public production service, add passwords or one-time codes for every account before treating usernames as secure identities.

## Main behavior

- Browsing and searching are public; playing, liking, saving, and personal playlists require a valid, unblocked session.
- Pressing a heart while signed out opens login. After login, the playlist chooser opens automatically.
- A heart saves the song to Liked Songs and opens the chooser for any custom playlist.
- Artist songs and search results support incremental pagination. Albums load their canonical full track list.
- Podcast Index adds publisher-distributed podcast episodes without changing the existing JioSaavn music catalog.
- Playlists can be shared with another registered username. Recipients see them under **Shared with you**.
- The repeat button cycles off > repeat queue > repeat one.
