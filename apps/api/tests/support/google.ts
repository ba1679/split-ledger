// This module is imported exclusively by the isolated test runner. It replaces
// Google's external HTTP responses; Better Auth still validates state/PKCE/JWT
// and creates its normal PostgreSQL session and HttpOnly cookie.
import { generateKeyPairSync, createSign, createHash, randomUUID } from 'node:crypto';
import type { Identity } from './world.js';
const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwk = { ...publicKey.export({format:'jwk'}), kid:'ledger-test-key', alg:'RS256', use:'sig' };
const codes = new Map<string,{ user: Identity; nonce:string|null; challenge:string|null; redirect:string }>();
export function registerGoogleCode(user:Identity,url:URL) {
 const code=randomUUID(); codes.set(code,{user,nonce:url.searchParams.get('nonce'),challenge:url.searchParams.get('code_challenge'),redirect:url.searchParams.get('redirect_uri')!});return code;
}
function idToken(user:Identity,nonce:string|null) {
 const now=Math.floor(Date.now()/1000);
 const head=Buffer.from(JSON.stringify({alg:'RS256',kid:'ledger-test-key',typ:'JWT'})).toString('base64url');
 const body=Buffer.from(JSON.stringify({iss:'https://accounts.google.com',aud:'ledger-test-google',sub:user.id,name:user.name,email:user.email,email_verified:true,iat:now,exp:now+600,...(nonce?{nonce}:{})})).toString('base64url');
 const value=`${head}.${body}`;return `${value}.${createSign('RSA-SHA256').update(value).sign(privateKey,'base64url')}`;
}
export function installGoogleMock(){
 const original=globalThis.fetch;
 globalThis.fetch=async(input,init)=>{
  const url=typeof input==='string'?input:input instanceof URL?input.toString():input.url;
  if(url==='https://www.googleapis.com/oauth2/v3/certs')return Response.json({keys:[jwk]});
  if(url==='https://oauth2.googleapis.com/token'){
   const raw=init?.body ?? (input instanceof Request ? await input.text(): '');
   const fields=new URLSearchParams(typeof raw==='string'?raw:raw instanceof URLSearchParams?raw.toString():'');
   const code=fields.get('code')??'';const data=codes.get(code);codes.delete(code);
   if(!data||fields.get('redirect_uri')!==data.redirect||fields.get('client_id')!=='ledger-test-google'||(data.challenge&&createHash('sha256').update(fields.get('code_verifier')??'').digest('base64url')!==data.challenge))return Response.json({error:'invalid_grant'},{status:400});
   return Response.json({access_token:'isolated-test-access-token',token_type:'Bearer',expires_in:600,id_token:idToken(data.user,data.nonce)});
  }
  return original(input,init);
 };
 return ()=>{globalThis.fetch=original;codes.clear();};
}
