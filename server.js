require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const fs = require('fs');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Set up multer for handling file uploads (stored in memory for direct transfer)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Telegram Bot credentials
const BOT_TOKEN = '8591722390:AAHmn4ipYJjepQXUwF7c9As32yRWC7jwLBo';
const CHANNEL_ID = '-1003800908189';

// Upload endpoint
app.post('/upload', upload.single('video'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No video file provided.' });
        }

        console.log(`Received file: ${req.file.originalname} (${req.file.size} bytes)`);

        // 1. Send the video file to the Telegram Channel using Telegram Bot API
        const telegramApiUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendVideo`;

        const FormData = require('form-data');
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

        console.log('Successfully uploaded to Telegram.');

        // 2. Extract the file_id of the uploaded video
        const fileId = data.result.video.file_id;

        // 3. Get the file path from Telegram to construct the direct streaming URL
        const getFileUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getFile?file_id=${fileId}`;
        const fileResponse = await fetch(getFileUrl);
        const fileData = await fileResponse.json();

        if (!fileData.ok) {
            console.error('Telegram getFile Error:', fileData.description);
            // Telegram Bot API enforces a strict 20MB limit for downloading files via getFile
            if (fileData.error_code === 400 && fileData.description.includes('too big')) {
                return res.status(400).json({ error: 'Telegram Bot API Limit Exceeded: The file successfully uploaded to the channel, but Telegram bots cannot retrieve direct streamable URLs for files larger than 20MB. Please compress your video under 20MB and try again.' });
            }
            return res.status(500).json({ error: 'Failed to retrieve streamable file path from Telegram API. Try a smaller file size.', details: fileData.description });
        }

        const filePath = fileData.result.file_path;

        // Construct the raw, streamable URL
        const streamableUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;

        console.log('Generated streamable URL:', streamableUrl);

        // Return the final URL back to the frontend to store in localStorage
        res.json({
            success: true,
            url: streamableUrl,
            message: 'Video successfully hosted on Telegram and processed.'
        });

    } catch (error) {
        console.error('Server error during upload:', error);
        res.status(500).json({ error: 'Internal server error processing the upload.' });
    }
});

// CORS Proxy endpoint for local testing
app.get('/api/cors-proxy', async (req, res) => {
    const targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).json({ error: 'Missing target url parameter.' });
    try {
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Accept': '*/*',
                'Referer': targetUrl
            }
        });
        if (!response.ok) return res.status(response.status).send('Failed to fetch remote asset');
        const contentType = response.headers.get('content-type') || 'video/mp4';
        res.setHeader('Content-Type', contentType);
        res.setHeader('Access-Control-Allow-Origin', '*');
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Start the server
app.listen(port, () => {
    console.log(`Telegram Video Backend running on http://localhost:${port}`);
    console.log(`Waiting to intercept video uploads from the Admin panel...`);
});
