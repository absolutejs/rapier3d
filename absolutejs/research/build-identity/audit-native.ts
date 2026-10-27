import {readFileSync,writeFileSync} from 'node:fs';
import {assertQualifiedNative} from '../../scripts/qualified-native';
const manifest=JSON.parse(readFileSync('absolutejs/native-kernel.json','utf8'));
const candidate=readFileSync('.absolutejs/api/rapier_wasm3d_bg.wasm');
const original=readFileSync('../rapier-kinematic-release/.absolutejs/staged-portable/rapier_wasm3d_bg.wasm');
if(!candidate.equals(original))throw Error('API-only release changed native bytes');
assertQualifiedNative(candidate,manifest);
const gyro=readFileSync('../rapier-gyro-release/.absolutejs/gyro-qualified/rapier_wasm3d_bg.wasm');
let rejected=false;
try{assertQualifiedNative(gyro,manifest);}catch(error){rejected=String(error).includes('Native kernel is not qualified');}
if(!rejected)throw Error('Rejected gyro experiment was accepted by stable guard');
writeFileSync('absolutejs/research/build-identity/native-audit.json',JSON.stringify({sameNativeBytes:true,excludedGyroKernelRejected:true,...manifest},null,2)+'\n');
