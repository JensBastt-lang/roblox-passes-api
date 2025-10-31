export default async function handler(req, res) {
  const { universeid, placeid } = req.query;

  // Debug log om te zien wat Vercel ontvangt
  console.log("Query ontvangen:", req.query);

  if (!universeid && !placeid) {
    return res.status(400).json({ error: "Gebruik ?universeid=... of ?placeid=..." });
  }

  try {
    // 🔹 1) Universe ID bepalen
    let uni = universeid?.trim();
    if (!uni && placeid) {
      const r = await fetch(`https://apis.roblox.com/universes/v1/places/${placeid}/universe`);
      const j = await r.json();
      uni = j.universeId?.toString();
      if (!uni) {
        return res.status(400).json({ error: "Kon UniverseId niet vinden via placeid" });
      }
    }

    if (!uni) {
      return res.status(400).json({ error: "UniverseId ontbreekt of ongeldig" });
    }

    // 🔹 2) Roblox API aanroepen om GamePasses op te halen
    const url1 = `https://games.roblox.com/v1/universes/${uni}/game-passes?limit=50`;
    console.log("Fetching gamepasses van:", url1);

    const p1 = await fetch(url1);
    const d1 = await p1.json();

    let passes = (d1?.data || []).map(p => ({
      id: p.id,
      name: p.name,
      price: p.price ?? p.product?.priceInRobux ?? 0,
      type: "GamePass"
    }));

    // 🔹 3) Fallback — sommige universes tonen beter via Catalog API
    if (passes.length === 0) {
      const url2 = `https://catalog.roblox.com/v1/search/items?creatorId=${uni}&creatorType=Universe&limit=50&category=GamePass&sortOrder=Desc`;
      console.log("Fallback catalog call:", url2);

      const p2 = await fetch(url2);
      const d2 = await p2.json();

      const fromCatalog = (d2?.data || []).map(i => ({
        id: i.id,
        name: i.name,
        price: i.price ?? 0,
        type: "GamePass"
      }));

      // merge results zonder dubbels
      const seen = new Set(passes.map(x => x.id));
      for (const it of fromCatalog) {
        if (!seen.has(it.id)) passes.push(it);
      }
    }

    console.log("Aantal gevonden passes:", passes.length);
    return res.status(200).json(passes);
  } catch (e) {
    console.error("Fout tijdens ophalen:", e);
    return res.status(500).json({ error: "Fout bij ophalen van game passes" });
  }
}
