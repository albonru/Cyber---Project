import * as bcu from 'bigint-crypto-utils'
import { bigintToBase64, base64ToBigint } from 'bigint-conversion'


export class MyRsaPrivatKey {
  
  d: bigint
  n: bigint
  static sign: any

  constructor(d: bigint, n: bigint) {
    this.d = d
    this.n = n
    
  }

  decrypt(c: bigint): bigint {
    return bcu.modPow(c, this.d, this.n) //=== clear message
  }

  sign(m: bigint): bigint {
    return bcu.modPow(m, this.d, this.n) 
  }
}

export interface MyRsaJsonPupblicKey {
  e: string // base64
  n: string // base64
}
export class MyRsaPupblicKey {
  e: bigint
  n: bigint

  constructor(e: bigint, n: bigint) {
    this.e = e
    this.n = n
  }

  blind(m: bigint, r:bigint): bigint {
    
    const b = m * (this.encrypt(r));
    return bcu.toZn(b, this.n);
  }

  unblind(m: bigint, r:bigint): bigint {
    const b = bcu.modInv(r, this.n);
    return bcu.toZn(m*b, this.n);
  }

  encrypt(m: bigint): bigint {
    const c = bcu.modPow(m, this.e, this.n)
    return c
  }

  verify(s: bigint): bigint {
    return bcu.modPow(s, this.e, this.n)
  }

  toJSON(): MyRsaJsonPupblicKey {
    return {
      e: bigintToBase64(this.e),
      n: bigintToBase64(this.n)
    }
  }

  static fromJSON(rsaJsonPubKey: MyRsaJsonPupblicKey): MyRsaPupblicKey {
    const e = base64ToBigint(rsaJsonPubKey.e)
    const n = base64ToBigint(rsaJsonPubKey.n)

    return new MyRsaPupblicKey(e, n)
  }
}

export interface KeyPair {
  publicKey: MyRsaPupblicKey
  privateKey: MyRsaPrivatKey
}

export const generateKeys = async function (bitlength: number): Promise<KeyPair> {
  const e = 65537n
  let p: bigint, q: bigint, n: bigint, phi: bigint
  do {
    p = await bcu.prime(bitlength / 2 + 1)
    q = await bcu.prime(bitlength / 2)
    n = p * q
    phi = (p - 1n) * (q - 1n)
  }
  while (bcu.bitLength(n) !== bitlength || (phi % e === 0n))

  const publicKey = new MyRsaPupblicKey(e, n)

  const d = bcu.modInv(e, phi)

  const privateKey = new MyRsaPrivatKey(d, n)

  return {
    publicKey,
    privateKey
  }

}


