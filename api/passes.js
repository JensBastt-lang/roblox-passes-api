export default async function handler(req, res) {
  const { universeid, placeid } = req.query;

  if (!universeid && !placeid) {
    return res.status(400).json({ error: "Provide ?universeid=... or ?placeid=..." });
  }

  try {
    // 1) Resolve UniverseId if only placeid is given
    let uni = universeid;
    if (!uni && placeid) {
      const r = await fetch(`https://apis.roblox.com/universes/v1/places/${placeid}/universe`);
      const j = await r.json();
      uni = j.universeId?.toString();
      if (!uni) {
        return res.status(400).json({ error: "Could not resolve UniverseId from placeid" });
      }
    }

    // 2) Primary: official universe game-passes endpoint
    const url1 = `https://games.roblox.com/v1/universes/${uni}/game-passes?limit=50`;
    const p1 = await fetch(url1);
    const d1 = await p1.json();
    let passes = (d1?.data || []).map(p => ({
      id: p.id,
      name: p.name,
      price: p.price ?? p.product?.priceInRobux ?? 0,
      type: "GamePass"
    }));

    // 3) Fallback via Catalog (sommige universes tonen hier sneller resultaten)
    if (passes.length === 0) {
      const url2 = `https://catalog.roblox.com/v1/search/items?creatorId=${uni}&creatorType=Universe&limit=50&category=GamePass&sortOrder=Desc`;
      const p2 = await fetch(url2);
      const d2 = await p2.json();
      const fromCatalog = (d2?.data || []).map(i => ({
        id: i.id,
        name: i.name,
        price: i.price ?? 0,
        type: "GamePass"
      }));
      // merge unique
      const seen = new Set(passes.map(x => x.id));
      for (const it of fromCatalog) if (!seen.has(it.id)) passes.push(it);
    }

    return res.status(200).json(passes);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Failed to fetch game passes" });
  }
}
