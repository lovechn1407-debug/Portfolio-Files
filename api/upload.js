const multer = require('multer');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const FormData = require('form-data');

// Use memory storage since Vercel functions are ephemeral (no disk)
const upload = multer({ storage: multer.memoryStorage() });

const BOT_TOKEN = process.env.BOT_TOKEN || '8591722390:AAHmn4ipYJjepQXUwF7c9As32yRWC7jwLBo';
const CHANNEL_ID = process.env.CHANNEL_ID || '-1003800908189';

// Helper to run multer in a Vercel serverless function
function runMiddleware(req, res, fn) {
    return new Promise((resolve, reject) => {
        fn(req, res, (result) => {
            if (result instanceof Error) return reject(result);
            return resolve(result);
        });
    });
}

// CRITICAL: Tell Vercel to increase body limit to 50MB and disable default JSON body parsing
// so multer can handle the raw multipart stream from the admin panel
module.exports.config = {
    api: {
        bodyParser: false,
        responseLimit: false,
        sizeLimit: '50mb',
    }
};

module.exports = async (req, res) => {
    // Allow cross-origin requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed.' });
    }

    try {
        // Run multer middleware to parse the uploaded file
        await runMiddleware(req, res, upload.single('video'));

        if (!req.file) {
            return res.status(400).json({ error: 'No video file provided.' });
        }

        console.log(`Received file: ${req.file.originalname} (${req.file.size} bytes)`);

        // 1. Send the video file to the Telegram Channel
        const telegramApiUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`;

        const form = new FormData();
        form.append('chat_id', CHANNEL_ID);
        form.append('video', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype,
        });

        console.log('Uploading to Telegram...');
        const response = await fetch(telegramApiUrl, {
            method: 'POST',
            body: form,
            headers: form.getHeaders()
        });

        const data = await response.json();

        if (!data.ok) {
            console.error('Telegram API Error:', data.description);
            return res.status(500).json({ error: 'Failed to upload to Telegram.', details: data.description });
        }

        // 2. Extract file_id and get the streamable URL
        const fileId = data.result.video.file_id;

        const getFileUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`;
        const fileResponse = await fetch(getFileUrl);
        const fileData = await fileResponse.json();

        if (!fileData.ok) {
            if (fileData.error_code === 400 && fileData.description.includes('too big')) {
                return res.status(400).json({ error: 'File too large: Telegram cannot retrieve URLs for files over 20MB. Please compress your video and try again.' });
            }
            return res.status(500).json({ error: 'Failed to retrieve streamable URL from Telegram.', details: fileData.description });
        }

        const filePath = fileData.result.file_path;
        const streamableUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

        console.log('Generated streamable URL:', streamableUrl);

        res.json({
            success: true,
            url: streamableUrl,
            message: 'Video successfully hosted on Telegram.'
        });

    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ error: 'Internal server error processing the upload.' });
    }
};
