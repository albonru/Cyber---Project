import './App.css';
import React, { useState, useEffect, useRef } from "react";
import axios from 'axios'
import * as rsa from './rsa'
import * as bigintConversion from 'bigint-conversion'
import { sha256 } from 'js-sha256';
import * as bcu from 'bigint-crypto-utils'
import { Buffer } from 'buffer';
import { blindMessageHash } from 'blind-signature/dist/lib/blind';
window.Buffer = window.Buffer || Buffer;

function App() {
  const censo = "http://localhost:3001/censo";
  const mesa = "http://localhost:3002/mesa";
  const urna = "http://localhost:3003/urna";

  const [data, setData] = useState({
    name: "",
    pw: ""
  });
  const { name, pw } = data;
  
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [messagetxt, setmessagetxt] = useState<String>("");
  let [signedtxt, setsignedtxt] = useState<String>();

  let [r, setr] = useState<bigint>(bigintConversion.bufToBigint(window.crypto.getRandomValues(new Uint8Array(16))));
  let [unblinded, setunblinded] = useState<bigint>();
  const textAreaChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setmessagetxt(event.target.value);
  };

  const [voterblinded, setvoterblinded] = useState<String>();
  const [censopubkey, setcensopubkey] = useState<rsa.MyRsaPupblicKey>();
  const [voterkeys, setvoterkeys] = useState<rsa.KeyPair>();
  const [votercertificado, setcertificado] = useState<rsa.CertificadoVotante>();

  useEffect(() => {
    if (textareaRef && textareaRef.current) {
      textareaRef.current.style.height = "0px";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = scrollHeight + "px";
    }
  }, [messagetxt]);

  // OK
  // generate rsa key pair for V
  const generateKeys = async () => {
    const vkeys = await rsa.generateKeys(2048);
    console.log(vkeys.publicKey);
    setvoterkeys(vkeys);
  }

  // OK
  // login -> recollir pubkC -> hash + cegado
  const logIn = async () => {
    axios.post(`${censo}/login`, data)
    .then((res) => {
      if (res.data === 'error') {
        alert('Login incorrecte');
      }
      else {
        alert('Login correcte');
        setcensopubkey(rsa.MyRsaPupblicKey.fromJSON(res.data));
        console.log(rsa.MyRsaPupblicKey.fromJSON(res.data));
        // hashblindvoterpub();
        // console.log('pubkV hash cegado: ' + voterblinded)
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
    setr(bcu.randBetween(censopubkey!.n, 0n))
    const blinded = censopubkey!.blind(bigintConversion.base64ToBigint(hash), r);
    setvoterblinded(bigintConversion.bigintToBase64(blinded))
    console.log('pubkV hash cegado: ' + bigintConversion.bigintToBase64(blinded))
  }

  // OK
  // envia hash cegado i el reb signat
  const sendToCenso = async () => {
    if (voterblinded === "")
      alert('no hi ha hash cegado');
    else {
      const res = await axios.post(censo + `/sign`, { text: voterblinded });
      setsignedtxt(res.data.signed.toString());
      console.log(`signed blind-hash: ${res.data.signed.toString()}`);
      if(res.status == 200) {
        alert('hash firmado');
      }
      else {
        alert('no se ha podido firmar');
      }
    }
  }

  // OK
  // desciega la firma y genera certificado del votante
  const unblindMessage = async () => {
    if (signedtxt == null) {
      alert("not signed yet")
    } else {
      let blindsignedbigint = bigintConversion.base64ToBigint(signedtxt.toString());
      const u = censopubkey!.unblind(blindsignedbigint, r);
      setunblinded(u);
      const cert = new rsa.CertificadoVotante(voterkeys?.publicKey!,u);
      setcertificado(cert);
      console.log(cert);
    }
  }
  
  const verifyMessage = async () => {
    const verifybigint = voterkeys?.publicKey.verify(unblinded!);
    alert(bigintConversion.bigintToText(verifybigint!));
  }

  const submitHandler = (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    console.log(data);
    logIn();
  }

  const changeHandler = (e: { target: { name: any; value: any; }; }) => {
    setData({ ...data, [e.target.name]: [e.target.value] });
  }

  return (
    <div className="App">
      <header className="App-header">
        <button onClick={() => generateKeys()}>
          generate voter keys
        </button>
        <br />
        <form onSubmit={submitHandler}>
          <input type="text" name="name" placeholder="username" value={name} onChange={changeHandler} />
          <br />
          <input type="password" name="pw" placeholder="password" value={pw} onChange={changeHandler} />
          <br />
          <button type="submit" name="submit" >LogIn</button>
        </form> <br />
        <button onClick={() => hashblindvoterpub()}>
          generate hash and blind it
        </button><br />
        <button onClick={() => sendToCenso()}>
          send blinded hash to be signed
        </button>
        <br />
        <button onClick={() => unblindMessage()}>
          generar certificate
        </button>
      </header>
    </div>
  )

}

export default App;

const styles: { [name: string]: React.CSSProperties } = {
  container: {
    marginTop: 50,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  textareaDefaultStyle: {
    marginTop: 10,
    padding: 5,
    width: 400,
    display: "block",
    resize: "none",
    backgroundColor: "#eee",
  },
};