import React from 'react';
import * as bigintConversion from 'bigint-conversion'
import './App.css';
import {Buffer} from 'buffer';
import { useState } from 'react';
import { useRef } from 'react';
import { generateKey } from 'crypto';
import { PrivateKey } from 'paillier-bigint';
window.Buffer = window.Buffer || Buffer;


function App() {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [sharestxt, setsharestxt] = useState<String>("");
  const [messagetxt, setmessagetxt] = useState<String>("");
  const [textareaheight, setTextareaheight] = useState(1); 
  const [pubkeys, setpubkeys] = useState(); 
  const [prvkeys, setprvkeys] = useState(); 
  const [secreto, setsecretos] = useState<String>(); 


  const textAreaChange2 = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    
  };
 
  const textAreaChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setmessagetxt(event.target.value);
  
  };

  const genkeys = async () => {
    const paillierBigint = require('paillier-bigint');
    const { publicKey, privateKey } = await paillierBigint.generateRandomKeys(3072)
    setpubkeys(publicKey)
    setprvkeys(privateKey)
    // const privateKey = new paillierBigint.PrivateKey(lambda, mu, publicKey)
    const jsonKey = { lambda: bigintConversion.bigintToBase64(privateKey.lambda), mu: bigintConversion.bigintToBase64(privateKey.mu) };
    const jstring = JSON.stringify(jsonKey);
    setsecretos(jstring)
    alert(jstring);
  }

  const sendMessage = async () => {
    const sss = require('shamirs-secret-sharing');
    const shares: Buffer[] = sss.split(secreto, { shares: 3, threshold: 3});
    const sharesHex: string[] = [];
    shares.forEach((share: Buffer) => {
      sharesHex.push(bigintConversion.bufToHex(share));
    })
    //console.log("Claves Enviadas: " + sharesHex);
    setsharestxt(sharesHex.toString());
  }

  const restoreMessage = async () => {
    const sss = require('shamirs-secret-sharing');
    const myArray = sharestxt.split(",");
    const recovered = sss.combine(myArray);
    const json = JSON.parse(recovered)
    console.log(json)
  }


  return (
    <div className="App">
      <header className="App-header">
        <button className='sendbtn' onClick={() => genkeys()}>get keys</button>
      <textarea
         value={sharestxt.replace(/,/g, ',\n')}
        //value={sharestxt.toString()}
        style={{width: 800}}
        rows={7}
        ></textarea>
        <button className='sendbtn' onClick={() => sendMessage()}>get shares</button>

        <textarea
        ref={textareaRef}
        style={styles.textareaDefaultStyle}
        onChange={textAreaChange}
        rows={textareaheight}
      ></textarea>
        <button className='sendbtn' onClick={() => restoreMessage()}>recover</button>

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
    marginTop:10,
    padding: 5,
    width: 800,
   
    display: "block",
    resize: "none",
    backgroundColor: "#eee",
  },
};