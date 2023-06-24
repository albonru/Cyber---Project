import express from 'express'
import cors from 'cors'
import * as rsa from './rsa'
import * as bigintConversion from 'bigint-conversion'
import { Request, Response } from 'express';
import { Router } from 'express';
import bodyParser from "body-parser";

const rsaKeysPromise = rsa.generateKeys(2048);
const router = Router();
const port = 3014
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

let users = [
    {n:"Pepito", p: "1234", gotcert: false}, 
    {n:"Antonio", p: "qwer", gotcert: false}, 
    {n:"Carlos", p: "asdf", gotcert: false}, 
    {n:"Marcos", p: "zxcv", gotcert: false},
    {n:"Ana", p: "0987", gotcert: false},
    {n:"Julia", p: "ñlkj", gotcert: false}
];

function verifyuser(n:string,p:string,t:string){
    
}

// OK
// confirma login i verifica primera solicitud
app.post('/censo/login', async (req: Request, res: Response) => {
    console.log(req.body);
    const i = users.findIndex(element => ((element.n === req.body.name)&&(element.p === req.body.pw)&&(element.gotcert===false)));
    if((i !== -1)){
        users[i].gotcert=true;
        let messageBigint = bigintConversion.base64ToBigint(req.body.text);
        let signedbigint = (await rsaKeysPromise).privateKey.sign(messageBigint);
        let signed = bigintConversion.bigintToBase64(signedbigint)
        console.log("signed "+signed)
        res.json({signed:signed})
    }
    else{
        res.json("error")
    }
    
    
})

// cliente pide pubkey, server la manda
app.get('/censo/pubkey', async (req: Request, res: Response) => {
    const rsaKeys = await rsaKeysPromise
    console.log(rsaKeys)
    res.json(rsaKeys.publicKey.toJSON())
})

app.listen(port, function () {
    console.log(`listenning on http://locahost:${port}`)
})