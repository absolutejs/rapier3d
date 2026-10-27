import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {assertQualifiedNative} from '../../scripts/qualified-native';
const stable=readFileSync('.absolutejs/api/rapier_wasm3d_bg.wasm');
const research=readFileSync(process.argv[2]!);
const manifest=JSON.parse(readFileSync('absolutejs/native-kernel.json','utf8'));
const accepted=assertQualifiedNative(stable,manifest);
let rejected=false,reason='';
try {assertQualifiedNative(research,manifest);}catch(e){rejected=true;reason=String(e);}
if(!rejected)throw Error('Research kernel was accepted');
const result={passed:true,stableSha256:accepted,researchSha256:createHash('sha256').update(research).digest('hex'),researchRejected:rejected,reason};
writeFileSync('absolutejs/research/native-build-guard/result.json',JSON.stringify(result,null,2)+'\n');console.log(result);
