import './App.css';
import React, { useState} from "react";
import axios from 'axios'
import * as rsa from './rsa'
import * as bigintConversion from 'bigint-conversion'
import { sha256 } from 'js-sha256';
import * as bcu from 'bigint-crypto-utils'
import { Buffer } from 'buffer';
import bigInt from 'big-integer';
import * as paillier from "paillier-bigint"

window.Buffer = window.Buffer || Buffer;

function App() {
  const censo = "http://localhost:3014/censo/";
  const mesa = "http://localhost:3002/";
  const urna = "http://localhost:3009/urna/";

  const [data, setData] = useState({
    name: "",
    pw: "",
  });
  const {name, pw} = data

  let [signedtxt, setsignedtxt] = useState<String>();
  let [r, setr] = useState<bigint>(bigintConversion.bufToBigint(window.crypto.getRandomValues(new Uint8Array(16))));

  const [voterblinded, setvoterblinded] = useState<String>("");
  const [censopubkey, setcensopubkey] = useState<rsa.MyRsaPupblicKey>();
  const [mesapubkey, setmesapubkey] = useState<paillier.PublicKey>();

  const [voterkeys, setvoterkeys] = useState<rsa.KeyPair>();
  const [votercertificado, setcertificado] = useState<rsa.CertificadoVotante>();
  const [voto, setvoto] = useState<{encv:bigint, sign:bigint}>();

 

  // OK
  // generate rsa key pair for V
  const generateKeys = async () => {
    const vkeys = await rsa.generateKeys(2048);
    console.log(vkeys.publicKey);
    setvoterkeys(vkeys);
  }

  //ok
  const getmesakey = () => {
    axios.get(`${mesa}pubkey`, )
    .then((res) => {
      if (res.data === 'error') {
        alert('error mesa key');
      }
      else {
        const c:paillier.PublicKey = new paillier.PublicKey(bigintConversion.base64ToBigint(res.data.n), bigintConversion.base64ToBigint(res.data.e) )
        setmesapubkey(c);
        if (mesapubkey){
          console.log("mesa pub ok")
        }

      }
    });
  }

  //ok
  const getcensokey = () => {
    axios.get(`${censo}pubkey`, )
    .then((res) => {
      if (res.data === 'error') {
        alert('error censo key');
      }
      else {
        setcensopubkey(rsa.MyRsaPupblicKey.fromJSON(res.data));
        console.log('censo pub key: '+ JSON.stringify(censopubkey));
     
      }
    });
  }

  // OK
  // fa el hash de la pubkV
  const keyToHash = () => {
    const json = voterkeys!.publicKey.toJSON();
    const hash = sha256(JSON.stringify(json))
    console.log(`pubkV hash: ${hash}`);;
    return hash
  }

  // OK
  // cega el hash de la pubkv
  const hashblindvoterpub = () => {
    const hash = keyToHash();
    let enc: Boolean = false;
    while (!enc){
      if (r % censopubkey!.n !== 0n)
        enc = true;
      else
        setr(bigintConversion.bufToBigint(window.crypto.getRandomValues(new Uint8Array(16))));
    }
    const blinded = censopubkey!.blind(bigintConversion.base64ToBigint(hash), r);
    setvoterblinded(bigintConversion.bigintToBase64(blinded))
    console.log('pubkV hash cegado: ' + voterblinded)
  }

  // OK
  // login -> hash + cegado
  const logIn = async () => {
    await axios.post(`${censo}login`, {name:data.name.toString(), pw:data.pw.toString(), text:voterblinded})
    .then((res) => {
      if (res.data === 'error') {
        alert('Login incorrecte');
      }
      else {
        console.log("res signed"+res.data.signed)
        alert('Login correcte');
        setsignedtxt(res.data.signed.toString());
        console.log(`signed blind-hash: ${signedtxt}`);
      }
    });
  }

  // OK
  // desciega la firma y genera certificado del votante
  const unblindMessage = async () => {
    if (signedtxt == null) {
      alert("not signed yet")
    } else {
      let blindsignedbigint = bigintConversion.base64ToBigint(signedtxt.toString());
      const u = censopubkey!.unblind(blindsignedbigint, r);
      const cert = new rsa.CertificadoVotante(voterkeys?.publicKey!,u);
      console.log("ccert "+ JSON.stringify(cert.toString()))
      setcertificado(cert);
    }
  }

  const encryptvote = async () => {
    let v
    if (votercertificado == null) {
      alert("no certificate")
    } else {
      if (candidatevalue==="000000001"){
        v = 1000000001n
      }else if(candidatevalue==="000001000"){
        v = 1000001000n
      }else if (candidatevalue==="001000000"){
        v = 1001000000n
      }else{
        alert("select voter")
      }

      if (v){
        const e = mesapubkey!.encrypt(v);
        const h = sha256(bigintConversion.bigintToBase64(e));
        const s = voterkeys!.privateKey.sign(bigintConversion.base64ToBigint(h));
        setvoto({encv:e,sign:s})
      }

    }
  }

  const sendvoto = async () => {
    await axios.post(`${urna}dipositar`, {
      vote:{encv:bigintConversion.bigintToBase64(voto!.encv), sign:bigintConversion.bigintToBase64(voto!.sign)},
      cert:{pubkey:votercertificado!.pubkey.toJSON(), signature:bigintConversion.bigintToBase64(votercertificado!.signature)}})
    .then((res) => {
      if (res.data === 'ok') {
        alert('send voto correcte');
      }
      else {
        alert('send voto incorrecte');
      }
    });
  }

  
  // const verifyMessage = async () => {
  //   const verifybigint = voterkeys?.publicKey.verify(unblinded!);
  //   alert(bigintConversion.bigintToText(verifybigint!));
  // }

  const submitHandler = (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    console.log(data);
    logIn();
  }

  const changeHandler = (e: { target: { name: any; value: any; }; }) => {
    setData({ ...data, [e.target.name]: [e.target.value] });
  }

  const [candidatevalue, setcandidatevalue] = useState("")

  const onOptionChange = (e: { target: { value: React.SetStateAction<string>; }; }) => {
    setcandidatevalue(e.target.value)
  }
  

  return (
    <div className="App">
      <header className="App-header">

        <button onClick={() => generateKeys()}>generate voter keys</button>
        <button onClick={() => getcensokey()}>get censo public key</button>
        <button onClick={() => getmesakey()}>get mesa public key</button>

        <button onClick={() => hashblindvoterpub()}>generate hash and blind it</button><br />

        <form onSubmit={submitHandler}>
          <input type="text" name="name" placeholder="username" value={name} onChange={changeHandler} />
          <br />
          <input type="password" name="pw" placeholder="password" value={pw} onChange={changeHandler} />
          <br />
          <button type="submit" name="submit" >LogIn</button>
        </form> 

        <br />
        <button onClick={() => unblindMessage()}>generar certificate</button>
        <br />

        <div className="App">
      <h5>Select candidate</h5>
      
      <label htmlFor="regular">A </label>
      <label htmlFor="medium">B</label>
      <label htmlFor="large"> C</label>
      
      <div>
      <input
        type="radio"
        name="candidatevalue"
        value="001000000"
        id="regular"
        checked={candidatevalue === "001000000"}
        onChange={onOptionChange}
      />
      <input
        type="radio"
        name="candidatevalue"
        value="000001000"
        id="medium"
        checked={candidatevalue === "000001000"}
        onChange={onOptionChange}
      />
      <input
        type="radio"
        name="candidatevalue"
        value="000000001"
        id="large"
        checked={candidatevalue === "000000001"}
        onChange={onOptionChange}
      />
      </div>

      <p>
        Send vote <strong>{candidatevalue}</strong>
      </p>
      <button onClick={() => encryptvote()}>encript and sign vote</button>
      <button onClick={() => sendvoto()}>send vote</button>

    </div>

      </header>
    </div>
  )

}

export default App;

