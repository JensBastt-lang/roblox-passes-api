const axios = require('axios');

module.exports = async (req, res) => {
  const userId = req.query.userId;
  if (!userId || isNaN(userId)) {
    return res.status(400).json({ error: 'Valid userId query parameter is required' });
  }

  try {
    // Fetch the user's game passes using the new API endpoint (pagination simplified to first 100)
    const passesResponse = await axios.get(`https://apis.roproxy.com/game-passes/v1/users/${userId}/game-passes?count=100`);
    const passes = passesResponse.data.gamePasses || [];

    // Filter on-sale passes
    const onSalePasses = [];
    for (const pass of passes) {
      const passId = pass.id;
      try {
        const productResponse = await axios.get(`https://economy.roproxy.com/v2/assets/${passId}/details`);
        const product = productResponse.data;
        if (product.isForSale && product.price > 0) {
          onSalePasses.push({
            id: passId,
            name: product.name,
            price: product.price,
            description: product.description || '',
            thumbnail: null  // Placeholder, will be filled below
          });
        }
      } catch (err) {
        // Skip if error fetching details
      }
    }

    // Fetch thumbnails in batch if any on-sale passes found
    if (onSalePasses.length > 0) {
      const passIds = onSalePasses.map(p => p.id).join(',');
      try {
        const thumbsResponse = await axios.get(`https://thumbnails.roproxy.com/v1/assets?assetIds=${passIds}&returnPolicy=PlaceHolder&size=150x150&format=Png`);
        const thumbs = thumbsResponse.data.data;
        onSalePasses.forEach(p => {
          const thumb = thumbs.find(t => t.targetId === p.id);
          if (thumb) p.thumbnail = thumb.imageUrl;
        });
      } catch (err) {
        // If thumbnail fetch fails, proceed without them
      }
    }

    res.json(onSalePasses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch game passes' });
  }
};
