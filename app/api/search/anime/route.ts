export const runtime = "nodejs";

type AniListResponse = {
  data?: {
    Page?: {
      media?: Array<{
        id: number;
        title?: { romaji?: string; english?: string; native?: string };
        coverImage?: { extraLarge?: string; large?: string };
        seasonYear?: number;
        startDate?: { year?: number };
      }>;
    };
  };
};

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim();

  if (!q) {
    return new Response(JSON.stringify({ results: [] }), {
      headers: { "content-type": "application/json" },
    });
  }

  const query = `
    query ($search: String) {
      Page(page: 1, perPage: 24) {
        media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
          id
          title { romaji english native }
          coverImage { extraLarge large }
          seasonYear
          startDate { year }
        }
      }
    }
  `;

  const resp = await fetch("https://graphql.anilist.co", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query, variables: { search: q } }),
  });

  if (!resp.ok) {
    const text = await resp.text();
    return new Response(text || "AniList search failed", { status: 500 });
  }

  const json = (await resp.json()) as AniListResponse;

  const results =
    json.data?.Page?.media
      ?.map((m) => {
        const title = m.title?.english || m.title?.romaji || m.title?.native || "Untitled";
        const imageUrl = m.coverImage?.extraLarge || m.coverImage?.large || "";
        const year = m.seasonYear || m.startDate?.year;

        return {
          id: String(m.id),
          title,
          year,
          imageUrl,
        };
      })
      .filter((r) => r.imageUrl) ?? [];

  return new Response(JSON.stringify({ results }), {
    headers: { "content-type": "application/json" },
  });
}