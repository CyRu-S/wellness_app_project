import { generateKeyPairSync } from 'node:crypto';
import { Buffer } from 'node:buffer';

const { publicKey, privateKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const publicJwk = publicKey.export({ format: 'jwk' });
const privateJwk = privateKey.export({ format: 'jwk' });
const point = Buffer.concat([Buffer.from([4]), Buffer.from(publicJwk.x, 'base64url'), Buffer.from(publicJwk.y, 'base64url')]);
console.log(`WEB_PUSH_PUBLIC_KEY=${point.toString('base64url')}`);
console.log(`WEB_PUSH_PRIVATE_KEY=${privateJwk.d}`);
console.log('Keep the private key in backend deployment secrets. Reuse the same pair across deployments.');
