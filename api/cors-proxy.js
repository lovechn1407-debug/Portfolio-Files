const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

module.exports = async (req, res) => {
    // Allow CORS headers for all origins
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const targetUrl = req.query.url;
    if (!targetUrl) {
        return res.status(400).json({ error: 'Missing target URL query parameter.' });
    }

    try {
        const headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept': '*/*',
            'Accept-Encoding': 'identity',
            'Referer': targetUrl
        };
        if (req.headers.range) {
            headers['Range'] = req.headers.range;
        }

        const response = await fetch(targetUrl, { headers });

        if (!response.ok) {
            return res.status(response.status).send(`Failed to fetch remote asset: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type') || 'video/mp4';
        const contentLength = response.headers.get('content-length');

        res.setHeader('Content-Type', contentType);
        if (contentLength) res.setHeader('Content-Length', contentLength);

        const arrayBuffer = await response.arrayBuffer();
        res.status(200).send(Buffer.from(arrayBuffer));
    } catch (error) {
        console.error('CORS Proxy Error:', error);
        res.status(500).json({ error: 'Failed to proxy request.', details: error.message });
    }
};
