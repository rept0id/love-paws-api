import express from 'express';
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import url from 'url';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 8080;

let aiApiKey;

/*** * Utils * ***/

const utilRemoveSymbols = (str) => {
    /* 
     * Regex analysis :
     * 
     * [^...]: "not"
     *  - \p{L}: Any kind of letter from any language.
     *  - \p{N}: Any kind of numeric character.
     *  - \s: Whitespace characters
     * 
     * u: Unicode flag
     * g: Global flag
     */
    // It is a design decision to use the global regex flag instead of replaceAll
    return str.replace(/[^\p{L}\p{N}\s]/gu, '');
};

/*** * AI API key * ***/

const initAiApiKey = async () => {
    try {
        const p = path.join(__dirname, 'conf', 'private', 'api_key', 'api_key.json');
    
        const d = await fs.readFile(p, 'utf8');
        const dJson = JSON.parse(d);
    
        aiApiKey = dJson.api_key;
    } catch (error) {
        console.error('Error reading or parsing the API key file:', error);
        process.exit(1);
    }
}

/*** * Middlewares * ***/

const initMiddlewares = () => {
    // JSON
    app.use(express.json());

    // CORS
    app.use(cors());

    // Rate Limit
    const rateLimitObj = rateLimit({
        windowMs: 1000 * 60 * 1 * 60 * 24, // 1 day
        max: 100,
        message: 'Too many requests from this IP, please try again later.'
    }); // max. 100 requests / per day / (per IP)
    app.use(rateLimitObj);
}

/*** * Routes * ***/

const spawnRoutes = () => {
    app.all('/', async (req, res) => {
        res.json({"data":"Welcome to the Love Paws API"})
    });

    app.all('/ping', async (req, res) => {
        res.json({"data":"pong"})
    });

    app.post('/inbox/send_message', async (req, res) => {
        try {
            /*** * Definitions * ***/

            // Definitions : Parameters

            const p = {"data" : {}, "metadata" : {}};

            p.data.recipient = utilRemoveSymbols(req.body?.data?.recipient);
            p.data.msg = utilRemoveSymbols(req.body?.data?.msg);

            // Definitions : Result

            const r = {"data" : {}, "metadata" : {}};

            /*** * AI Req * ***/

            // AI Req : Define

            const aiReq = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${aiApiKey}`
                },
                body: JSON.stringify({
                    model: 'gpt-3.5-turbo',
                    messages: [
                        { role: 'system', content: 'You are a cute cat named ' + p.data.recipient + ' that always refers to cat things and always asks questions back to maintain a conversation.' },
                        { role: 'user', content: p.data.msg }
                    ],
                    temperature: 0.7
                })
            });

            // AI Req : Execute

            const aiReqRes = await aiReq.json();

            // AI Req : Parse

            // AI Req : Parse : Internal

            const aiRes = {"data" : {}, "metadata" : {}};

            aiRes.data.msg = aiReqRes?.choices[0]?.message?.content;

            // AI Req : Parse : External

            r.data.msg = aiRes.data.msg;
            
            /*** * Return * ***/

            res.json(r);
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });
}

/*** * Init * ***/

const init = async () => {
    try {
        await initAiApiKey();

        initMiddlewares();
        spawnRoutes();

        app.listen(port, () => {
            console.log('Server is listening on port 3000');
        });
    } catch (error) {
        console.error('Error during initialization:', error);
        process.exit(1);
    }
}

/*** * Main * ***/

const main = () => {
    init();
}

main();