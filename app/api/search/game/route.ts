export const runtime = "nodejs";

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getTwitchAppToken() {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Missing TWITCH_CLIENT_ID or TWITCH_CLIENT_SECRET in .env.local");
  }

  // Reuse token if still valid (with a safety buffer)
  const now = Date.now();
  if (cachedToken && cachedToken.expiresAt - 60_000 > now) {
    return cachedToken.token;
  }

  const url = new URL("https://id.twitch.tv/oauth2/token");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("client_secret", clientSecret);
  url.searchParams.set("grant_type", "client_credentials");

  const resp = await fetch(url.toString(), { method: "POST" });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(text || "Failed to get Twitch token");
  }

  const json = (await resp.json()) as { access_token: string; expires_in: number };
  cachedToken = {
    token: json.access_token,
    expiresAt: now + json.expires_in * 1000,
  };

  return cachedToken.token;
}

type IGDBGame = {
  id: number;
  name: string;
  first_release_date?: number; // unix seconds
  cover?: { image_id?: string };
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  if (!q) {
    return new Response(JSON.stringify({ results: [] }), {
      headers: { "content-type": "application/json" },
    });
  }

  const clientId = process.env.TWITCH_CLIENT_ID!;
  const token = await getTwitchAppToken();

  // IGDB queries are usually POST with a text/plain body (Apicalypse)
  const body = `
    search "${q.replace(/"/g, "")}";
    fields name, first_release_date, cover.image_id;
    where version_parent = null;
    limit 24;
  `.trim();

  const resp = await fetch("https://api.igdb.com/v4/games", {
    method: "POST",
    headers: {
      "Client-ID": clientId,
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      "Content-Type": "text/plain",
    },
    body,
  });

  if (!resp.ok) {
    const text = await resp.text();
    return new Response(text || "IGDB search failed", { status: 500 });
  }

  const games = (await resp.json()) as IGDBGame[];

  const results = games
    .map((g) => {
      const year = g.first_release_date
        ? new Date(g.first_release_date * 1000).getUTCFullYear()
        : undefined;

      // IGDB image URL pattern
      const imageUrl = g.cover?.image_id
        ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${g.cover.image_id}.jpg`
        : "";

      return {
        id: String(g.id),
        title: g.name,
        year,
        imageUrl,
      };
    })
    .filter((r) => r.imageUrl);

  return new Response(JSON.stringify({ results }), {
    headers: { "content-type": "application/json" },
  });
}