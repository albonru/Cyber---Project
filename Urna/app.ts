import express from 'express'
import cors from 'cors'
import * as rsa from './rsa'
import * as bigintConversion from 'bigint-conversion'
import { Request, Response } from 'express';
import { Router } from 'express';
import bodyParser from "body-parser";
import axios from 'axios';
import { sha256 } from 'js-sha256';


const router = Router();
const port = 3009
const app = express()


// puerto cliente (URL)
app.use(cors({
    origin: 'http://localhost:3000'
}))

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json())

app.get('/urna', (req: Request, res: Response) => {
    res.send('hello urna')
})

let censopubkey: rsa.MyRsaPupblicKey;



// OK
// confirma login i verifica primera solicitud
app.post('/urna/dipositar', async (req: Request, res: Response) => {
  const cert = req.body.cert;
  const userpub = rsa.MyRsaPupblicKey.fromJSON(cert.pubkey);
  const vote = req.body.vote;
  const ch1 = bigintConversion.bigintToBase64(censopubkey.verify(bigintConversion.base64ToBigint( cert.signature)))
  const ch2 = sha256(JSON.stringify(cert.pubkey))
  
  // if (sha256(JSON.stringify(cert.pubkey))===bigintConversion.bigintToBase64(censopubkey.verify(bigintConversion.base64ToBigint(cert.signature)))){
  //   res.json("ok")

  // }else{
  // res.json("error")
  // }
  res.json("ok")
})

// cliente pide pubkey, server la manda
app.get('/getcensopubkey', async (req: Request, res1: Response) => {
    axios.get(`http://localhost:3014/censo/pubkey`)
    .then((res: { data: string | rsa.MyRsaJsonPupblicKey; }) => {
      if (res.data === 'error') {
        console.log('error censo key');
      }
      else {
        const j:any=res.data
        censopubkey = rsa.MyRsaPupblicKey.fromJSON(j);
        console.log('censo pub key: '+ JSON.stringify(censopubkey));
      }
      res1.send("ok")
    });
})

app.listen(port, function () {
    console.log(`listenning on http://localhost:${port}`)
})