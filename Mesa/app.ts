import express from 'express'
import cors from 'cors'
import * as rsa from './rsa'
import * as bigintConversion from 'bigint-conversion'
import { Request, Response } from 'express';
import { Router } from 'express';

import * as paillier from 'paillier-bigint'
//import * as sss from 'shamirs-secret-sharing'
import {Buffer} from 'buffer';
import axios from 'axios';


const rsaKeysPromise = rsa.generateKeys(2048)
const router = Router();
const port = 3002
const app = express()
let paillierkeys: paillier.KeyPair;
let publicrsakeys: rsa.MyRsaPupblicKey;
let recoverpriv:paillier.PrivateKey;

//genkey
//split
//recover
//getsum

// puerto cliente (URL)
app.use(cors({
    origin: 'http://localhost:3000'
}))

app.use(express.urlencoded());

app.get('/mesa', (req: Request, res: Response) => {
    res.send('hello mesa')
})

app.get('/pubkey', async (req: Request, res: Response) => {
    res.json(publicrsakeys.toJSON())
    
})

// app.post('/recover', async (req: Request, res: Response) => {

//     res.json(publicrsakeys.toJSON())
// })

app.get('/recover', function(request, response, next){

	response.send(`
		<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">
		<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.2/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-EVSTQN3/azprG1Anm3QDgpJLIm9Nao0Yz1ztcQTwFspd3yD65VohhpuuCOmLASjC" crossorigin="anonymous">
		<div class="card-body">
        <form method="POST" action="/restorekey" id="usrform">
            <div class="mb-3">
                <label>Splits separated by coma</label>
                
                <textarea name="splits" class="form-control" rows="10" form="usrform"></textarea>
            </div>
            <div class="mb-3">
                <input type="submit" class="btn btn-primary" value="Add" />
            </div>
        </form>
		</div>		
	`);


});

app.post('/restorekey', function(request, response, next){

	const sharestxt = request.body.splits.toString();
    const sss = require('shamirs-secret-sharing');
    const myArray = sharestxt.split(",");
    const recovered = sss.combine(myArray);
    const json = JSON.parse(recovered)
    const publickey:paillier.PublicKey = new paillier.PublicKey(bigintConversion.base64ToBigint(json.publickey.n), bigintConversion.base64ToBigint(json.publickey.g) )
    recoverpriv=new paillier.PrivateKey(bigintConversion.base64ToBigint(json.lambda), bigintConversion.base64ToBigint(json.mu), publickey)
    response.send('ok')
});


app.get('/split', async (req: Request, res: Response) => {
    const jsonKey = { lambda: bigintConversion.bigintToBase64(paillierkeys.privateKey.lambda), mu: bigintConversion.bigintToBase64(paillierkeys.privateKey.mu), 
        publickey: {n:bigintConversion.bigintToBase64(paillierkeys.publicKey.n), g:bigintConversion.bigintToBase64(paillierkeys.publicKey.g)} };
    const secreto = JSON.stringify(jsonKey);
    const sss = require('shamirs-secret-sharing');
    const shares: Buffer[] = sss.split(secreto, { shares: 6, threshold: 3});
    const sharesHex: string[] = [];
    shares.forEach((share: Buffer) => {
      sharesHex.push(bigintConversion.bufToHex(share));
    })
    //console.log("Claves Enviadas: " + sharesHex);
    res.json(sharesHex.toString())
})

// genera claus
app.get('/genkey', async (req: Request, res: Response) => {
    paillierkeys = await paillier.generateRandomKeys(2048)
    console.log(paillierkeys)
    publicrsakeys = new rsa.MyRsaPupblicKey(paillierkeys.publicKey.g, paillierkeys.publicKey.n)
    res.send('ok')
})

app.get('/getsum', async (req: Request, res1: Response) => {
    axios.get(`http://localhost:3009/getvotos`)
    .then((res) => {
      if (res.data === 'error') {
        console.log('error censo key');
        res1.send('eror')
      }
      else{
        const j = bigintConversion.base64ToBigint(res.data.votos)
        const s:String = recoverpriv!.decrypt(j).toString()
        //const s = paillierkeys.privateKey.decrypt(j)
        const count = s.substring(0,s.length-9);
        const countA = s.substring(s.length-9,s.length-6);
        const countB = s.substring(s.length-6,s.length-3);
        const countC = s.substring(s.length-3,s.length);

        res1.send(`NUM VOTES: ${count} <br> VotesA: ${countA} <br> VotesB: ${countB} <br> VotesC: ${countC}`)
      }
    })
})


app.listen(port, function () {
    console.log(`listenning on http://localhost:${port}`)
})