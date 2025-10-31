export default async function handler(request, response) {
  const { userid } = request.query;

  if (!userid) {
    return response.status(400).json({ error: "Missing userid parameter" });
  }

  try {
    const res = await fetch(
      `https://catalog.roblox.com/v1/search/items?creatorId=${userid}&creatorType=User&limit=30&sortOrder=Desc`
    );
    const data = await res.json();

    // Filter enkel items die echt te koop staan
    const items = data?.data
      ?.filter(item => item.isForSale)
      ?.map(item => ({
        id: item.id,
        name: item.name,
        price: item.price ?? 0,
        type: item.itemType,
        assetType: item.assetType,
        thumbnail: item.thumbnail?.imageUrl ?? null
      })) ?? [];

    return response.status(200).json(items);
  } catch (err) {
    console.error(err);
    return response.status(500).json({ error: "Failed to fetch user items" });
  }
}
