import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {assertQualifiedNative} from '../../scripts/qualified-native';
const dir='absolutejs/research/kinematic-precision/';
const json=(p:string)=>JSON.parse(readFileSync(p,'utf8'));
const sha=(p:string)=>createHash('sha256').update(readFileSync(p)).digest('hex');
const manifest=json('absolutejs/native-kernel.json');
assertQualifiedNative(readFileSync('.absolutejs/api/rapier_wasm3d_bg.wasm'),manifest);
const portability=json(dir+'path-portability/comparison.json');
if(!portability.passed||!portability.byteIdentical||portability.localPathLeakage!==false||portability.artifacts.length!==2||portability.artifacts.some((a:any)=>a.sha256!==manifest.wasmSha256||a.bytes!==manifest.wasmBytes))throw Error('Independent checkout portability qualification failed');
const staged=json(dir+'path-portability/staged-source-identity.json');
const stagedRoot='.absolutejs/native-source/'+staged.contentSha256+'/';
const stagedManifest=json(stagedRoot+'source-manifest.json');
const graph=json(dir+'path-portability/dependency-graph.json');
if(!staged.passed||!graph.passed||!graph.identicalResolvedPackagesFeaturesAndEdges||graph.packageCount!==85)throw Error('Native workspace inputs changed');
let nativeSourceFiles=0;
for(const [path,hash] of Object.entries(stagedManifest.outputs))if(path.endsWith('.rs')){
 if(hash!==sha(path)||hash!==sha(stagedRoot+path))throw Error('Generated native source differs from canonical source');
 nativeSourceFiles++;
}
if(nativeSourceFiles!==275)throw Error('Incomplete native source snapshot');
const researchPath=process.argv[2];if(!researchPath)throw Error('Explicit research WASM negative control required');
const research=readFileSync(researchPath);if(research.subarray(0,4).toString('hex')!=='0061736d')throw Error('Negative control is not a WASM file');
let researchRejected=false;
try{assertQualifiedNative(research,manifest);}catch{researchRejected=true;}
if(!researchRejected)throw Error('Research kernel accepted by stable guard');
const source=json(dir+'candidate-native.json');for(const [path,hash] of Object.entries(source.sourceHashes))if(sha(path)!==hash)throw Error('Qualified native source changed');
const baseline=json(dir+'baseline-paths.json'),candidate=json(dir+'paths.json');let unchangedFrames=0;
if(candidate.rows.length!==72||baseline.rows.length!==72||candidate.rows.some((r:any)=>r.frames.length!==30))throw Error('Incomplete path matrix');
const initial=json(dir+'path-portability/initial-qualification/paths.json');
if(JSON.stringify(initial.rows)!==JSON.stringify(candidate.rows))throw Error('Path remapping changed physical trajectories');
if(candidate.engineSha256!==sha('dist/rapier.mjs')||baseline.engineSha256!==sha('.absolutejs/baseline-dist/rapier.mjs'))throw Error('Path engine provenance mismatch');
for(let i=0;i<candidate.rows.length;i++){
 const row=candidate.rows[i],old=baseline.rows[i];
 if(['kind','budget','offset','omega'].some(key=>row[key]!==old[key]))throw Error('Path configuration mismatch');
 if(row.kind!=='velocity'){if(JSON.stringify(row.frames)!==JSON.stringify(old.frames))throw Error('Control trajectory changed');unchangedFrames+=row.frames.length;}
 else if(row.maxPositionErrorM>=3e-6||row.maxRotationErrorRad>=2e-6)throw Error('Prescribed path tolerance failed');
}
const tests=readFileSync(dir+'tests.log','utf8');if(!tests.includes('28 pass')||!tests.includes('0 fail')||!tests.includes('48020 expect()'))throw Error('Suite receipt mismatch');
const browser=json(dir+'browser-result.json');if(browser.gpu!==false||!browser.result.passed)throw Error('Browser check failed');
if(!json(dir+'caps.json').passed)throw Error('Speed-cap controls failed');
if(readFileSync(dir+'types.log','utf8').trim())throw Error('Strict types failed');
const pack=json(dir+'pack-audit.json');if(!pack.passed||pack.bundleSha256!==sha('dist/rapier.mjs'))throw Error('Package audit mismatch');
const velocities=candidate.rows.filter((r:any)=>r.kind==='velocity');
if(velocities.length!==24||unchangedFrames!==1440)throw Error('Missing velocity or control cases');
writeFileSync(dir+'qualification.json',JSON.stringify({passed:true,release:'0.6.0',native:manifest,portableNativeBuild:{independentCheckouts:2,byteIdentical:true,localPathLeakage:false,unchangedPathFrames:2160},bundleSha256:sha('dist/rapier.mjs'),researchKernelRejected:researchRejected,rejectedResearchWasmSha256:sha(researchPath),tests:{passed:28,failed:0,assertions:48020},pathConfigurations:candidate.rows.length,unchangedDynamicAndPositionFrames:unchangedFrames,maxVelocityPathPositionErrorM:Math.max(...velocities.map((r:any)=>r.maxPositionErrorM)),maxVelocityPathRotationErrorRad:Math.max(...velocities.map((r:any)=>r.maxRotationErrorRad)),browserGpu:false,tarballIntegrity:pack.integrity,scope:'Only prescribed velocity-driven kinematic integration changes. No tagged geometry or CCD research. Additional CPU cost is documented; general contact accuracy remains separately unqualified.'},null,2)+'\n');
console.log('Stable release qualification passed');
