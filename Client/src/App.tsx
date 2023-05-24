import './App.css';
import React, { useState, useEffect, useRef } from "react";
import axios from 'axios'
import * as rsa from './rsa'
import * as bigintConversion from 'bigint-conversion'

function App() {
  const censo = "http://localhost:3001/censo/";
  const mesa = "http://localhost:3002/mesa/";
  const urna = "http://localhost:3003/urna/";
  const [messagesend, setmessagesend] = useState<String>("");
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
    await getcensopubkey();
    let enc: Boolean = false;
    while (!enc) {
      if (r % pubkey!.n !== 0n)
        enc = true;
      else
        setr(bigintConversion.bufToBigint(window.crypto.getRandomValues(new Uint8Array(16))));
    }
    const blinded = pubkey!.blind(bigintConversion.textToBigint(messagetxt.toString()), r);
    setmessagesend(bigintConversion.bigintToBase64(blinded));
    setMessagecypher(blinded.toString());
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

  return (
    <div className="App">
      <header className="App-header">
        <p>
          Enter here the message.
        </p>

        <textarea
          ref={textareaRef}
          style={styles.textareaDefaultStyle}
          onChange={textAreaChange}

        ></textarea>
        <div>
          <button className='blindbtn' onClick={() => blindhash()} >blind</button>
        </div>
        <div>
          <textarea
            ref={textareaRef}
            style={styles.textareaDefaultStyle}
            onChange={textAreaChange}
            value={messagecypher}
            className='cyphertxt'
          ></textarea>
        </div>
        <div>
          <button className='sendbtn' onClick={async () => await sendToCenso()}>send to be signed</button>
        </div>

        <div>
          <textarea
            ref={textareaRef}
            style={styles.textareaDefaultStyle}
            onChange={textAreaChange}
            value={"signed message: " + signedtxt}
            className='cyphertxt'
          ></textarea>
        </div>
        <div>
          <button className='unblindbtn' onClick={() => unblindMessage()}>unblind</button>
        </div>
        <div>
          <textarea
            ref={textareaRef}
            style={styles.textareaDefaultStyle}
            onChange={textAreaChange}
            value={"unblinded message: " + undlindtxt}
            className='cyphertxt'
          ></textarea>
        </div>
        <div>
          <button className='verifybtn' onClick={async () => await verifyMessage()}>verify</button>
        </div>
      </header>

    </div>
  );

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