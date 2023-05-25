import './App.css';
import React, { useState, useEffect, useRef } from "react";
import axios from 'axios'
import * as rsa from './rsa'
import * as bigintConversion from 'bigint-conversion'
import { sha256 } from 'js-sha256';
import * as bcu from 'bigint-crypto-utils'  

function App() {
  const censo = "http://localhost:3001/censo";
  const mesa = "http://localhost:3002/mesa";
  const urna = "http://localhost:3003/urna";
  const [messagesend, setmessagesend] = useState<String>("");
  
  const [data,setData] = useState({
    name:"",
    pw:""
  });
  const {name,pw} = data;
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [messagetxt, setmessagetxt] = useState<String>("");
  let [signedtxt, setsignedtxt] = useState<String>();
  const [undlindtxt, setMessageunblind] = useState<String>('');

  let [r, setr] = useState<bigint>(bigintConversion.bufToBigint(window.crypto.getRandomValues(new Uint8Array(16))));
  let [unblinded, setunblinded] = useState<bigint>();
  const textAreaChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setmessagetxt(event.target.value);
  };

  const [messagecypher, setMessagecypher] = useState(''); //blinded message
  const [pubkey, assignPubKey] = useState<rsa.MyRsaPupblicKey>();

  const [censopubkey, setcensopubkey] = useState<rsa.MyRsaPupblicKey>();
  const [voterkeys, setvoterkeys] = useState<rsa.KeyPair>();
  
  const [voterkeyshash, setvoterkeyshash] = useState<rsa.MyRsaPupblicKey>();

  
  
  useEffect(() => {
    if (textareaRef && textareaRef.current) {
      textareaRef.current.style.height = "0px";
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = scrollHeight + "px";
    }
  }, [messagetxt]);

  

  const getcensopubkey = async () => {
    const res = await axios.get(`${censo}/pubkey`);
    // res.data es un json
    assignPubKey(rsa.MyRsaPupblicKey.fromJSON(res.data));
    console.log(pubkey);
  }

  const blindhash = async () => {
    //await getcensopubkey();
    // let enc: Boolean = false;
    // while (!enc) {
    //   if (r % pubkey!.n !== 0n)
    //     enc = true;
    //   else
    //     setr(bigintConversion.bufToBigint(window.crypto.getRandomValues(new Uint8Array(16))));
    // }



    setr(bcu.randBetween(censopubkey!.n, 0n))
    //const blinded = voterkeyshash * (censopubkey!.encrypt(r!) % censopubkey!.n)

    
    
    //const blinded = censopubkey!.blind(voterkeyshash, r);

  }

  const sendToCenso = async () => {
    if (messagetxt === "")
      alert('enter a message');
    else {
      const res = await axios.post(censo + `/tosign`, { text: messagesend });
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

  const keyToHash = async () => {
    const json = voterkeys!.publicKey.toJSON();
    json.e = sha256(json.e)
    json.n = sha256(json.n)
    return rsa.MyRsaPupblicKey.fromJSON(json)
  }

  const hashvoterpub = async () => {
    const hash = await keyToHash()
    setvoterkeyshash(hash)
  }
  
  const logIn = async () => {
    const res = await axios.post(`${censo}/login`,data);
    console.log(res);
    setcensopubkey(rsa.MyRsaPupblicKey.fromJSON(res.data));
    setvoterkeys(await rsa.generateKeys(2048));
    await hashvoterpub();
    await blindhash();
  }

  const submitHandler = (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    console.log(data);
    logIn();
  }

  const changeHandler = (e: { target: { name: any; value: any; }; }) => {
    setData({...data,[e.target.name]:[e.target.value]});
  }

  return(
    <div className="App">
      <header className="App-header">
        <form onSubmit={submitHandler}>
          <input type="text" name="name" placeholder="username" value={name} onChange={changeHandler}/>
          <br />
          <input type="password" name="pw" placeholder="password" value={pw} onChange={changeHandler}/>
          <br />
          <button type="submit" name="submit" >LogIn</button>
        </form>
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