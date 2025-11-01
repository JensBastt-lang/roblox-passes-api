const axios = require('axios');

module.exports = async (req, res) => {
  // ✅ accepteert zowel userId als userid
  const userId = req.query.userId || req.query.userid;

  // ✅ extra veilige check dat het enkel cijfers bevat
  if (!userId || !/^\d+$/.test(userId)) {
    return res.status(400).json({ error: 'Valid userId query parameter is required' });
  }

  try {
    // Fetch the user's game passes using the new API endpoint (first 100 only)
    const passesResponse = await axios.get(`https://apis.roproxy.com/game-passes/v1/users/${userId}/game-passes?count=100`);
    const passes = passesResponse.data.gamePasses || [];

    // Filter on-sale passes
    const onSalePasses = [];
    for (const pass of passes) {
      const passId = pass.id;
      try {
        const productResponse = await axios.get(`https://economy.roproxy.com/v2/assets/${passId}/details`);
        const product = productResponse.data;

        // ✅ extra check dat het niet "Limited" of "Offsale" is
        if (product.isForSale && product.price > 0 && !product.isLimited) {
          onSalePasses.push({
            id: passId,
            name: product.name,
            price: product.price,
            description: product.description || '',
            thumbnail: null // Placeholder (wordt hieronder ingevuld)
          });
        }
      } catch {
        // skip pass als details niet opgehaald konden worden
      }
    }

    // Fetch thumbnails (batch)
    if (onSalePasses.length > 0) {
      const passIds = onSalePasses.map(p => p.id).join(',');
      try {
        const thumbsResponse = await axios.get(
          `https://thumbnails.roproxy.com/v1/assets?assetIds=${passIds}&returnPolicy=PlaceHolder&size=150x150&format=Png`
        );
        const thumbs = thumbsResponse.data.data;
        onSalePasses.forEach(p => {
          const thumb = thumbs.find(t => t.targetId === p.id);
          if (thumb) p.thumbnail = thumb.imageUrl;
        });
      } catch {
        // als thumbnails falen, gewoon doorgaan zonder
      }
    }

    res.json(onSalePasses);
  } catch (error) {
    console.error('Error fetching passes:', error.message);
    res.status(500).json({ error: 'Failed to fetch game passes' });
  }
};
