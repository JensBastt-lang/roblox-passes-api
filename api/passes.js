export default async function handler(req, res) {
  try {
    const { userid, universeid } = req.query;
    if (!userid || !universeid) {
      return res.status(400).json({ error: "Missing userid or universeid" });
    }

    // 1. Haal alle gamepasses van het universe op
    const passesRes = await fetch(`https://games.roblox.com/v1/games/${universeid}/game-passes?sortOrder=Asc&limit=100`);
    if (!passesRes.ok) {
      return res.status(passesRes.status).json({ error: `Roblox API error: ${passesRes.status}` });
    }
    const passesData = await passesRes.json();

    // 2. Haal owned passes van de user op
    const inventoryRes = await fetch(`https://inventory.roblox.com/v1/users/${userid}/items/GamePass?sortOrder=Asc&limit=100`);
    if (!inventoryRes.ok) {
      return res.status(inventoryRes.status).json({ error: `Inventory API error: ${inventoryRes.status}` });
    }
    const inventoryData = await inventoryRes.json();

    // 3. Check welke gamepasses de user bezit
    const ownedIds = inventoryData.data.map(item => item.assetId);
    const ownedPasses = passesData.data.filter(p => ownedIds.includes(p.id));

    res.status(200).json({
      success: true,
      owned: ownedPasses.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price ?? 0
      }))
    });
  } catch (err) {
    console.error("API Error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
