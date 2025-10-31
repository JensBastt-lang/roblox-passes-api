export default async function handler(req, res) {
  const { userid, gameid } = req.query;

  if (!userid && !gameid) {
    return res
      .status(400)
      .json({ error: "Missing userid or gameid parameter" });
  }

  try {
    let items = [];

    // --- KLEDING (classic: TShirt=2, Shirt=11, Pants=12) ---
    if (userid) {
      const clothingURL =
        `https://catalog.roblox.com/v1/search/items?creatorId=${userid}&creatorType=User&limit=30&sortOrder=Desc`;
      const clothingRes = await fetch(clothingURL);
      const clothingData = await clothingRes.json();

      const clothing = clothingData?.data
        ?.filter(
          (i) =>
            i.isForSale &&
            [2, 11, 12].includes(i.assetType) // alleen klassieke kleding
        )
        ?.map((i) => ({
          id: i.id,
          name: i.name,
          price: i.price ?? 0,
          type: "Clothing",
          assetType: i.assetType, // 2, 11, 12
          thumbnail: i.thumbnail?.imageUrl ?? null,
        })) ?? [];

      items = items.concat(clothing);
    }

    // --- GAME PASSES ---
    if (gameid) {
      const passesURL = `https://games.roblox.com/v1/games/${gameid}/game-passes`;
      const passRes = await fetch(passesURL);
      const passData = await passRes.json();

      const passes =
        passData?.data?.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price ?? 0,
          type: "GamePass",
        })) ?? [];

      items = items.concat(passes);
    }

    return res.status(200).json(items);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Failed to fetch user items" });
  }
}
