import express from 'express'
import cors from 'cors'
import * as rsa from './rsa'
import * as bigintConversion from 'bigint-conversion'
import { Request, Response } from 'express';
import { Router } from 'express';
import bodyParser from "body-parser";

import * as paillier from 'paillier-bigint'
//import * as sss from 'shamirs-secret-sharing'
import {Buffer} from 'buffer';
//window.Buffer = window.Buffer || Buffer;

const rsaKeysPromise = rsa.generateKeys(2048)
const router = Router();
const port = 3002
const app = express()
let paillierkeys: paillier.KeyPair
let publicrsakeys: rsa.MyRsaPupblicKey;

// puerto cliente (URL)
app.use(cors({
    origin: 'http://localhost:3000'
}))

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json())

app.get('/mesa', (req: Request, res: Response) => {
    res.send('hello mesa')
})

app.get('/pubkey', async (req: Request, res: Response) => {
    res.json(publicrsakeys.toJSON())
})

app.get('/split', async (req: Request, res: Response) => {
    const jsonKey = { lambda: bigintConversion.bigintToBase64(paillierkeys.privateKey.lambda), mu: bigintConversion.bigintToBase64(paillierkeys.privateKey.mu) };
    const secreto = JSON.stringify(jsonKey);
    const sss = require('shamirs-secret-sharing');
    const shares: Buffer[] = sss.split(secreto, { shares: 3, threshold: 3});
    const sharesHex: string[] = [];
    shares.forEach((share: Buffer) => {
      sharesHex.push(bigintConversion.bufToHex(share));
    })
    //console.log("Claves Enviadas: " + sharesHex);
    console.log(sharesHex.toString());
    res.json(sharesHex.toString())
})

// genera claus
app.get('/genkey', async (req: Request, res: Response) => {
    paillierkeys = await paillier.generateRandomKeys(2048)
    console.log(paillierkeys)
    publicrsakeys = new rsa.MyRsaPupblicKey(paillierkeys.publicKey.g, paillierkeys.publicKey.n)
})

app.listen(port, function () {
    console.log(`listenning on http://localhost:${port}`)
})