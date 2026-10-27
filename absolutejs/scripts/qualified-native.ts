import {createHash} from 'node:crypto';
/** A release must explicitly qualify new native bytes before API packaging can use them. */
export function assertQualifiedNative(wasm: Uint8Array, manifest: unknown): string {
 const value=manifest as {schemaVersion?:number;wasmSha256?:string;wasmBytes?:number;solverChanges?:boolean};
 if(!value||value.schemaVersion!==1||typeof value.wasmSha256!=='string'||!/^[a-f0-9]{64}$/.test(value.wasmSha256)||!Number.isSafeInteger(value.wasmBytes)||typeof value.solverChanges!=='boolean')
  throw Error('Invalid stable native qualification manifest');
 const actual=createHash('sha256').update(wasm).digest('hex');
 if(actual!==value.wasmSha256||wasm.byteLength!==value.wasmBytes)
  throw Error(`Native kernel is not qualified for this stable package: got ${actual} (${wasm.byteLength} bytes), expected ${value.wasmSha256} (${value.wasmBytes} bytes). Rebuild the stable native source or qualify a new kernel; never reuse a research build.`);
 return actual;
}
