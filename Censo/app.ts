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

app.use(bodyParser.urlencoded({ extended : true }));
app.use(bodyParser.json())

app.get('/',(req: Request, res: Response)=>{
    res.send('hello world')
})

app.post('/tosign', async (req: Request, res: Response)=>{
    let message = req.body.text;

    let messageBigint = bigintConversion.base64ToBigint(message);
    console.log("blinded: "+messageBigint)
    let signedbigint = (await rsaKeysPromise).privateKey.sign(messageBigint);
    let signed=bigintConversion.bigintToBase64(signedbigint)
    console.log('signed message: '+ signed);
    res.json({signed})
})

app.post('/decrypt', async (req: Request, res: Response)=>{
    console.log(req.body.text)
    let message = req.body.text;
    let messageBigint = bigintConversion.base64ToBigint(message);
    let descryptedbigint = (await rsaKeysPromise).privateKey.decrypt(messageBigint);
    let descrypted=bigintConversion.bigintToText(descryptedbigint)
    console.log('decripted message: '+ descrypted);
    //funciona 
})

// cliente pide pubkey, server la manda
app.get('/rsapubkey', async (req: Request, res: Response)=>{
    const rsaKeys = await rsaKeysPromise
    console.log(rsaKeys)
    res.json(rsaKeys.publicKey.toJSON())
})

app.listen(port, function() {
    console.log(`listenning on http://locahost:${port}`)
})