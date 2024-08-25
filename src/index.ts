import express from 'express';
import fetch from 'node-fetch';
import fs from 'fs/promises';
import path from 'path';
import url from 'url';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const __rootname = path.resolve(__dirname, '..');

const app = express();
const port = 8080;

let aiApiKey: string | undefined;

/*** * Utils * ***/

const utilRemoveSymbols = (str: string): string => {
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
    return str.replace(new RegExp("/[^\p{L}\p{N}\s]", "gu"), '');
};

/*** * AI API key * ***/

const initAiApiKey = async (): Promise<void> => {
    try {
        const p = path.join(__rootname, 'conf', 'private', 'api_key', 'api_key.json');
    
        const v = await fs.readFile(p, 'utf8');
        const vParsed = JSON.parse(v);
    
        aiApiKey = vParsed.api_key;
    } catch (error) {
        console.error('Error reading or parsing the API key file:', error);
        process.exit(1);
    }
}

/*** * Middlewares * ***/

const initMiddlewares = (): void => {
    // JSON
    app.use(express.json());

    // CORS
    app.use(cors());

    /*** * Rate Limit * ***/
    // Trust Proxy
    // We assume that there is another top-level proxy that exposes data and handles HTTPS.
    app.set('trust proxy', true);
    // Limit
    const rateLimitObj = rateLimit({
        windowMs: 1000 * 60 * 60 * 24, // 1 day
        max: 100,
        message: 'Too many requests from this IP, please try again later.'
    }); // max. 100 requests / per day / (per IP)
    app.use(rateLimitObj);
}

/*** * Routes * ***/

const spawnRoutes = (): void => {
    app.all('/', async (req: express.Request, res: express.Response) => {
        res.json({"data":"Welcome to the Love Paws API"});
    });

    app.all('/ping', async (req: express.Request, res: express.Response) => {
        res.json({"data":"pong"});
    });

    app.post('/inbox/send_message', async (req: express.Request, res: express.Response) => {
        try {
            /*** * Definitions * ***/

            // Definitions : Parameters

            type tParams = {
                data: {
                    recipient?: string;
                    msg?: string;
                };
                metadata: Record<string, any>;
            };
            
            const params: tParams = { data: {}, metadata: {} };

            params.data.recipient = utilRemoveSymbols(req.body?.data?.recipient || '');
            params.data.msg = utilRemoveSymbols(req.body?.data?.msg || '');

            // Definitions : Answer

            type tAns = { 
                data: { 
                    msg?: string 
                }, 
                metadata: any 
            }

            const ans: tAns = { data: {}, metadata: {} };

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
                        { role: 'system', content: 'You are a cute cat named ' + params.data.recipient + ' that always refers to cat things and always asks questions back to maintain a conversation.' },
                        { role: 'user', content: params.data.msg }
                    ],
                    temperature: 0.7
                })
            });

            // AI Req : Execute

            interface iAiReqRes {
                choices: {
                    message: {
                        content: string;
                    };
                }[];
            }

            const aiReqRes = await aiReq.json() as iAiReqRes;

            // AI Req : Parse

            // AI Req : Parse : Internal

            type tAiRes = { 
                data: { 
                    msg?: string 
                }, 
                metadata: any 
            };

            const aiRes: tAiRes = { data: {}, metadata: {} };

            aiRes.data.msg = aiReqRes?.choices[0]?.message?.content;

            // AI Req : Parse : External

            ans.data.msg = aiRes.data.msg;
            
            /*** * Return * ***/

            res.json(ans);
        } catch (error) {
            console.error('Error:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    });
}

/*** * Init * ***/

const init = async (): Promise<void> => {
    try {
        await initAiApiKey();

        initMiddlewares();
        spawnRoutes();

        app.listen(port, () => {
            console.log('Server is listening on port 8080');
        });
    } catch (error) {
        console.error('Error during initialization:', error);
        process.exit(1);
    }
}

/*** * Main * ***/

const main = (): void => {
    init();
}

main();