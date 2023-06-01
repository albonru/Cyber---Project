import './App.css';
import React, { useState, useEffect, useRef } from "react";
import axios from 'axios'
import * as rsa from './rsa'
import * as bigintConversion from 'bigint-conversion'
import { sha256 } from 'js-sha256';
import * as bcu from 'bigint-crypto-utils'
import { Buffer } from 'buffer';
window.Buffer = window.Buffer || Buffer;

function App() {
  const censo = "http://localhost:3001/censo";
  const mesa = "http://localhost:3002/mesa";
  const urna = "http://localhost:3003/urna";
  const [messagesend, setmessagesend] = useState<String>("");

  const [data, setData] = useState({
    name: "",
    pw: ""
  });
  const { name, pw } = data;
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [messagetxt, setmessagetxt] = useState<String>("");
  let [signedtxt, setsignedtxt] = useState<String>();
  const [undlindtxt, setMessageunblind] = useState<String>('');

  let [r, setr] = useState<bigint>(bigintConversion.bufToBigint(window.crypto.getRandomValues(new Uint8Array(16))));
  let [unblinded, setunblinded] = useState<bigint>();
  const textAreaChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setmessagetxt(event.target.value);
  };

  const [voterblinded, setvoterblinded] = useState<String>(); //blinded message
  const [pubkey, assignPubKey] = useState<rsa.MyRsaPupblicKey>();

  const [censopubkey, setcensopubkey] = useState<rsa.MyRsaPupblicKey>();
  const [voterkeys, setvoterkeys] = useState<rsa.KeyPair>();

  const [voterkeyshash, setvoterkeyshash] = useState<String>();

  useEffect(() => {
    if (textareaRef && textareaRef.current) {
      textareaRef.current.style.height = "0px";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = scrollHeight + "px";
    }
  }, [messagetxt]);

  // OK
  // FALTA POPUP CONFIRMANT O NO EL LOGIN
  // login -> reb pubkC -> genera Vkeys -> hash + cegado
  const logIn = async () => {
    const res = await axios.post(`${censo}/login`, data);
    console.log(res);
    setcensopubkey(rsa.MyRsaPupblicKey.fromJSON(res.data));
    console.log(`CLIENT: pubkC n: ${censopubkey?.n}`);
    console.log(`CLIENT: pubkC e: ${censopubkey?.e}`);
    setvoterkeys(await rsa.generateKeys(2048));
    console.log(`CLIENT: pubkV n: ${voterkeys?.publicKey.n}`);
    console.log(`CLIENT: pubkV e: ${voterkeys?.publicKey.e}`);
    await hashblindvoterpub();
    console.log('CLIENT: pubkV hash cegado: ' + voterblinded)
  }

  // OK
  // cega el hash de la pubkv
  const hashblindvoterpub = async () => {
    const hash = await keyToHash()
    setr(bcu.randBetween(censopubkey!.n, 0n))
    const blinded = censopubkey!.blind(bigintConversion.base64ToBigint(hash), r);
    setvoterblinded(bigintConversion.bigintToBase64(blinded))
  }

  // OK
  // fa el hash de la pubkV
  const keyToHash = async () => {
    const json = voterkeys!.publicKey.toJSON();
    const hash = sha256(JSON.stringify(json))
    console.log(`CLIENT: pubkV hash: ${hash}`);
    return hash
  }

  const getcensopubkey = async () => {
    const res = await axios.get(`${censo}/pubkey`);
    // res.data es un json
    assignPubKey(rsa.MyRsaPupblicKey.fromJSON(res.data));
    console.log(pubkey);
  }

  const sendToCenso = async () => {
    if (voterblinded === "")
      alert('enter a message');
    else {
      const res = await axios.post(censo + `/tosign`, { text: voterblinded });
      setsignedtxt(res.data.signed.toString());
    }
  }

  const verifyMessage = async () => {
    const verifybigint = pubkey!.verify(unblinded!);
    alert(bigintConversion.bigintToText(verifybigint));
  }

  const unblindMessage = async () => {
    //await getserverpublickey();
    if (signedtxt == null) {
      alert("not signed yet")
    } else {
      let blindsignedbigint = bigintConversion.base64ToBigint(signedtxt.toString());
      console.log("blindsigned: " + blindsignedbigint);
      console.log("r: " + r);
      const u = pubkey!.unblind(blindsignedbigint, r);
      setMessageunblind(u.toString());
      setunblinded(u);
    }
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
        <form onSubmit={submitHandler}>
          <input type="text" name="name" placeholder="username" value={name} onChange={changeHandler} />
          <br />
          <input type="password" name="pw" placeholder="password" value={pw} onChange={changeHandler} />
          <br />
          <button type="submit" name="submit" >LogIn</button>
        </form> <br />
        <button onClick={() => sendToCenso()}>
          send to be signed
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