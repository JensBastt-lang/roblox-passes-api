// api/passes.js
// Verbeterde versie met foutafhandeling en logging
export default async function handler(req, res) {
  const userid = req.query.userid;
  if (!userid)
    return res.status(400).json({ success: false, error: "Missing userid" });

  const cookie = process.env.ROBLOX_COOKIE;
  if (!cookie)
    return res.status(500).json({ success: false, error: "Server missing ROBLOX_COOKIE" });

  // helperfunctie voor fetch met cookie + foutafhandeling
  const robloxFetch = async (url) => {
    console.log("🌐 Request:", url);
    const r = await fetch(url, {
      headers: {
        Cookie: `.ROBLOSECURITY=${cookie}`,
        "User-Agent": "roblox-passes-api/1.1",
      },
    });

    // log statuscodes
    console.log("↩️ Response", r.status, r.statusText, "for", url);
    if (r.status === 403) throw new Error("403 Forbidden (cookie ongeldig of expired)");
    if (r.status === 429) throw new Error("429 Rate limited");
    if (r.status === 404) throw new Error("404 Not Found (game of user bestaat niet)");
    if (!r.ok) {
      const text = await r.text().catch(() => null);
      throw new Error(`HTTP ${r.status}: ${text}`);
    }

    return r.json().catch(() => ({}));
  };

  try {
    console.log("🔍 API request ontvangen voor user:", userid);
    console.log("🔑 Cookie aanwezig:", !!cookie);

    let passes = [];

    // 1️⃣ Inventory passes (rechtstreeks van gebruiker)
    try {
      const inv = await robloxFetch(
        `https://inventory.roblox.com/v1/users/${userid}/items/GamePass?limit=100`
      );
      if (inv && Array.isArray(inv.data) && inv.data.length > 0) {
        for (const item of inv.data) {
          if (item && item.item) {
            passes.push({
              id: item.item.id,
              name: item.item.name,
              price: item.product?.priceInRobux || 0,
              source: "inventory",
            });
          }
        }
        console.log(`✅ Inventory passes gevonden: ${passes.length}`);
      } else {
        console.log("ℹ️ Geen inventory passes gevonden");
      }
    } catch (e) {
      console.warn("⚠️ Inventory fetch mislukt:", e.message);
    }

    // 2️⃣ Public games ophalen
    let games = [];
    try {
      const gamesResp = await robloxFetch(
        `https://games.roblox.com/v2/users/${userid}/games?accessFilter=Public&limit=100`
      );
      games = gamesResp.data || [];
      console.log(`🎮 Public games gevonden: ${games.length}`);
    } catch (e) {
      console.warn("⚠️ Games fetch mislukt:", e.message);
    }

    // 3️⃣ Passes per game
    for (const g of games) {
      try {
        const gp = await robloxFetch(
          `https://games.roblox.com/v1/games/${g.id}/game-passes`
        );
        if (gp && Array.isArray(gp.data)) {
          for (const p of gp.data) {
            passes.push({
              id: p.id,
              name: p.name,
              price: p.price || 0,
              gameId: g.id,
              gameName: g.name,
              source: "game",
            });
          }
        }
      } catch (err) {
        console.warn(`⚠️ Game ${g.id} passes fetch error:`, err.message);
      }
    }

    // 4️⃣ Duplicaten verwijderen
    const unique = [];
    const seen = new Set();
    for (const p of passes) {
      if (!p || !p.id) continue;
      if (!seen.has(p.id)) {
        seen.add(p.id);
        unique.push(p);
      }
    }

    console.log("✅ Totaal unieke passes:", unique.length);
    return res.status(200).json({ success: true, passes: unique });
  } catch (err) {
    console.error("💥 API crash:", err);
    return res.status(500).json({
      success: false,
      error: "Server error",
      details: err.message,
    });
  }
}
