export default async function handler(req, res) {
  try {
    const { userid, universeid } = req.query;
    if (!userid || !universeid)
      return res.status(400).json({ error: "Missing userid or universeid" });

    // 1. Haal gamepasses van dit universe
    const passesRes = await fetch(`https://games.roblox.com/v1/games/${universeid}/game-passes?sortOrder=Asc&limit=100`);
    if (!passesRes.ok)
      return res.status(passesRes.status).json({ error: `Roblox API error: ${passesRes.status}` });
    const passesData = await passesRes.json();

    // 2. Probeer inventory (kan 404 geven bij private)
    const invRes = await fetch(`https://inventory.roblox.com/v1/users/${userid}/items/GamePass?sortOrder=Asc&limit=100`);
    let ownedIds = [];
    if (invRes.ok) {
      const invData = await invRes.json();
      ownedIds = invData.data.map(item => item.assetId);
    }

    // 3. Combineer data
    const result = passesData.data.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price ?? 0,
      owned: ownedIds.includes(p.id)
    }));

    res.status(200).json({ success: true, passes: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
}
