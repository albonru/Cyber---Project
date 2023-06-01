import express from 'express'
import cors from 'cors'
import * as rsa from './rsa'
import * as bigintConversion from 'bigint-conversion'
import { Request, Response } from 'express';
import { Router } from 'express';
import bodyParser from "body-parser";

const rsaKeysPromise = rsa.generateKeys(2048)
const router = Router();
const port = 3001
const app = express()

// puerto cliente (URL)
app.use(cors({
    origin: 'http://localhost:3000'
}))

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json())

app.get('/censo', (req: Request, res: Response) => {
    res.send('hello censo')
})

// OK
// rep login i torna pubk del censo
app.post('/censo/login', async (req: Request, res: Response) => {
    const n1 = "Pepito";
    const p1 = "1234";
    const n2 = "Juanito";
    const p2 = "abcd";

    if ((req.body.name == n1 && req.body.pw == p1) || (req.body.name == n2 && req.body.pw == p2)) {
        const rsaKeys = await rsaKeysPromise
        console.log("login ok")
        res.json(rsaKeys.publicKey.toJSON())
    }
    else {
        res.send("error");
    }
})

app.post('/sign', async (req: Request, res: Response) => {
    let message = req.body.text;
    let messageBigint = bigintConversion.base64ToBigint(message);
    console.log("blinded: " + messageBigint)
    let signedbigint = (await rsaKeysPromise).privateKey.sign(messageBigint);
    let signed = bigintConversion.bigintToBase64(signedbigint)
    console.log('signed message: ' + signed);
    res.json({ signed })
})

// cliente pide pubkey, server la manda
app.get('/pubkey', async (req: Request, res: Response) => {
    const rsaKeys = await rsaKeysPromise
    console.log(rsaKeys)
    res.json(rsaKeys.publicKey.toJSON())
})

app.listen(port, function () {
    console.log(`listenning on http://locahost:${port}`)
})