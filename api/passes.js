// api/passes.js
// Deploy op Vercel (Node). Vereist env var: ROBLOX_COOKIE

export default async function handler(req, res) {
  const userid = req.query.userid;
  if (!userid) return res.status(400).json({ success: false, error: "Missing userid" });

  const cookie = process.env.ROBLOX_COOKIE;
  if (!cookie) return res.status(500).json({ success: false, error: "Server missing ROBLOX_COOKIE" });

  // helper: fetch met cookie en basic error handling
  const robloxFetch = async (url) => {
    const r = await fetch(url, {
      headers: {
        "Cookie": `.ROBLOSECURITY=${cookie}`,
        "User-Agent": "roblox-passes-api/1.0"
      }
    });
    if (!r.ok) {
      const text = await r.text().catch(()=>null);
      throw new Error(`HTTP ${r.status} ${r.statusText} -> ${text}`);
    }
    return r.json().catch(()=>({}));
  };

  try {
    // 1) probeer inventory endpoint (soms bevat het direct passes)
    let passes = [];
    try {
      const inv = await robloxFetch(`https://inventory.roblox.com/v1/users/${userid}/items/GamePass?limit=100`);
      if (inv && Array.isArray(inv.data) && inv.data.length > 0) {
        for (const item of inv.data) {
          if (item && item.item) {
            passes.push({
              id: item.item.id,
              name: item.item.name,
              price: item.product?.priceInRobux || 0,
              source: "inventory"
            });
          }
        }
      }
    } catch (e) {
      // geen probleem — ga verder met games lookup
      console.warn("inventory fetch failed:", e.message);
    }

    // 2) haal public games van user (fallback / aanvullende bron)
    const gamesResp = await robloxFetch(`https://games.roblox.com/v2/users/${userid}/games?accessFilter=Public&limit=100`);
    const games = (gamesResp && gamesResp.data) ? gamesResp.data : [];

    // 3) voor elke game: haal game-passes
    for (const g of games) {
      try {
        const gp = await robloxFetch(`https://games.roblox.com/v1/games/${g.id}/game-passes`);
        if (gp && Array.isArray(gp.data)) {
          for (const p of gp.data) {
            passes.push({
              id: p.id,
              name: p.name,
              price: p.price || 0,
              gameId: g.id,
              gameName: g.name,
              source: "game"
            });
          }
        }
      } catch (err) {
        // per-game fouten zijn ok, log ze en ga verder
        console.warn(`pass fetch failed for game ${g.id}:`, err.message);
      }
    }

    // 4) dedupe by id (in case of duplicates between inventory & game lists)
    const seen = new Set();
    const unique = [];
    for (const p of passes) {
      if (!p || !p.id) continue;
      if (!seen.has(p.id)) {
        seen.add(p.id);
        unique.push(p);
      }
    }

    return res.status(200).json({ success: true, passes: unique });
  } catch (err) {
    console.error("API error:", err);
    return res.status(500).json({ success: false, error: "Server error", details: err.message });
  }
}
