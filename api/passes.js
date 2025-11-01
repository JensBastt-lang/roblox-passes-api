// Tijdelijke cache in geheugen (reset bij Vercel restart)
const cache = new Map();

export default async function handler(req, res) {
  try {
    const { userid, universeid } = req.query;
    if (!userid || !universeid)
      return res.status(400).json({ error: "Missing userid or universeid" });

    const cacheKey = `${userid}-${universeid}`;
    const now = Date.now();

    // ✅ 1. Check cache (geldt 2 minuten)
    if (cache.has(cacheKey)) {
      const entry = cache.get(cacheKey);
      if (now - entry.time < 2 * 60 * 1000) {
        return res.status(200).json({ ...entry.data, cached: true });
      }
    }

    // ✅ 2. Haal gamepasses op van jouw universe
    const passesRes = await fetch(
      `https://games.roblox.com/v1/games/${universeid}/game-passes?sortOrder=Asc&limit=100`
    );

    if (!passesRes.ok)
      throw new Error(`GamePass API error: ${passesRes.status}`);

    const passesData = await passesRes.json();

    // ✅ 3. Probeer inventory van user (kan 404 zijn bij private)
    const invRes = await fetch(
      `https://inventory.roblox.com/v1/users/${userid}/items/GamePass?sortOrder=Asc&limit=100`
    );

    let ownedIds = [];
    if (invRes.ok) {
      const invData = await invRes.json();
      ownedIds = invData.data.map((item) => item.assetId);
    }

    // ✅ 4. Combineer data
    const result = passesData.data.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price ?? 0,
      owned: ownedIds.includes(p.id),
    }));

    const responseData = { success: true, passes: result };

    // ✅ 5. Sla in cache
    cache.set(cacheKey, { time: now, data: responseData });

    res.status(200).json(responseData);
  } catch (err) {
    console.error("API Error:", err);

    // ✅ 6. Gebruik fallback uit cache bij Roblox error
    const cacheKey = `${req.query.userid}-${req.query.universeid}`;
    if (cache.has(cacheKey)) {
      console.warn("Returning cached fallback data");
      return res.status(200).json({ ...cache.get(cacheKey).data, fallback: true });
    }

    res.status(500).json({ error: "Internal server error" });
  }
}
