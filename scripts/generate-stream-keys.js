import crypto from "node:crypto";
const { privateKey, publicKey } = crypto.generateKeyPairSync("ed25519");
const privateDer = privateKey.export({ format: "der", type: "pkcs8" });
const publicDer = publicKey.export({ format: "der", type: "spki" });
const rawPublic = publicDer.subarray(publicDer.length - 32);
console.log("STREAM_TOKEN_PRIVATE_KEY_BASE64=" + privateDer.toString("base64"));
console.log("streamTokenPublicKeyBase64=" + rawPublic.toString("base64"));
