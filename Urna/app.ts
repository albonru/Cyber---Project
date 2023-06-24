import express from 'express'
import cors from 'cors'
import * as rsa from './rsa'
import * as bigintConversion from 'bigint-conversion'
import { Request, Response } from 'express';
import { Router } from 'express';
import bodyParser from "body-parser";
import axios from 'axios';
import { sha256 } from 'js-sha256';
import bigInt from 'big-integer';


const router = Router();
const port = 3009
const app = express()

let Votos: {cert:bigint, voto:bigint}[] = [];

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
  const signbigint = bigintConversion.base64ToBigint(cert.signature);
  const ch1 = (censopubkey.verify(signbigint)); 
  const ch2 =bigintConversion.base64ToBigint(sha256(JSON.stringify(userpub.toJSON()))); //ok
  const vh1 = (userpub.verify(bigintConversion.base64ToBigint(vote.sign)));
  const vh2 = bigintConversion.base64ToBigint(sha256(vote.encv));
  if (ch1===ch2 && vh1===vh2){
    let c = Votos.findIndex((element) => ((element.cert === ch1)))
    if (c=== -1){
      Votos.push({cert:ch1,voto:bigintConversion.base64ToBigint(vote.encv)});
    }else{
      Votos[c].voto=vh1;
    }
    res.json("ok");
  }else{
    res.json("ko");
  }

})


app.get('/getvotos', async (req: Request, res: Response) => {
  let s = 1n;
  Votos.forEach(element => s*=element.voto);
  res.json({votos:bigintConversion.bigintToBase64(s)}); 
})

// cliente pide pubkey, server la manda
app.get('/getcensopubkey', async (req: Request, res1: Response) => {
    axios.get(`http://localhost:3014/censo/pubkey`)
    .then((res: { data:string | rsa.MyRsaJsonPupblicKey; }) => {
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