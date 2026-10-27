import {assertQualifiedNative} from './qualified-native';
import { mkdirSync, readdirSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { resolve, join, relative, dirname } from 'node:path';
const root = process.cwd();
const generated = resolve('.absolutejs/api');
const bindgen = resolve('.cache/tools/wasm-bindgen-0.2.129-x86_64-unknown-linux-musl/wasm-bindgen');
const native = resolve('.cache/target/wasm32-unknown-unknown/release/rapier_wasm3d.wasm');
mkdirSync(generated,{recursive:true});
const compile=Bun.spawnSync([bindgen,'--target','web','--out-dir',generated,native],{stdout:'inherit',stderr:'inherit'});
if(compile.exitCode) throw Error('wasm-bindgen failed');
function preprocess(text:string) {
 const enabled=[true]; const output:string[]=[];
 for(const line of text.split('\n')) {
  const directive=line.match(/^\s*\/\/\s*#(if|endif|else)\b\s*(.*)$/);
  if(directive) {
   if(directive[1]==='if') {
    if(!['DIM2','DIM3'].includes(directive[2]!.trim())) throw Error('Unknown dimension condition');
    enabled.push(enabled.at(-1)! && directive[2]!.trim()==='DIM3');
   } else if(directive[1]==='endif') {if(enabled.length===1) throw Error('Unbalanced dimensions');enabled.pop();}
   else throw Error('Unsupported conditional branch');
  } else if(enabled.at(-1)) output.push(line);
 }
 if(enabled.length!==1) throw Error('Unclosed dimensions');
 return output.join('\n');
}
const source=resolve('bindings/typescript/src.ts');
function copy(dir:string) {for(const e of readdirSync(dir,{withFileTypes:true})) {const file=join(dir,e.name);if(e.isDirectory())copy(file);else if(file.endsWith('.ts')) {const dest=join(generated,relative(source,file));mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,preprocess(readFileSync(file,'utf8')));}}}
copy(source);
writeFileSync(join(generated,'raw.ts'),'export * from "./rapier_wasm3d.js";\n');
const wasm=readFileSync(join(generated,'rapier_wasm3d_bg.wasm'));
const nativeQualification=JSON.parse(readFileSync('absolutejs/native-kernel.json','utf8'));
const qualifiedWasmSha256=assertQualifiedNative(wasm,nativeQualification);
const packageInfo=JSON.parse(readFileSync('package.json','utf8'));
const nativeLock=Bun.TOML.parse(readFileSync('bindings/typescript/Cargo.lock','utf8')) as {package?:{name?:string;version?:string;source?:string}[]};
const collisionPackages=nativeLock.package?.filter(p=>p.name==='parry3d')??[];
if(collisionPackages.length!==1||!collisionPackages[0]!.version||!collisionPackages[0]!.source)throw Error('Collision provenance requires one locked Parry source');
const collisionPackage=collisionPackages[0]!;

const buildInfo={schemaVersion:1,scope:'package',packageName:packageInfo.name,packageVersion:packageInfo.version,qualifiedKernelRelease:nativeQualification.qualifiedKernelRelease,upstream:'b716d375efc0201003f0cd9ef7168eee0b62c177',engine:'0.36.0',collisionLibraryVersion:collisionPackage.version,collisionSource:collisionPackage.source,bindings:'0.21.0',bindgen:'0.2.129',wasmSha256:qualifiedWasmSha256,wasmBytes:wasm.length,solverChanges:nativeQualification.solverChanges};
writeFileSync(join(generated,'build-info.ts'),readFileSync('absolutejs/api/build-info.ts','utf8')+'\n/** Frozen metadata; available before init(). */\nexport const buildInfo: PhysicsBuildInfo = Object.freeze('+JSON.stringify(buildInfo)+');\n');
writeFileSync(join(generated,'exports.ts'),readFileSync(join(generated,'exports.ts'),'utf8')+'\nexport {buildInfo, type PhysicsBuildInfo} from "./build-info";\n');
writeFileSync(join(generated,'init.ts'),`import initialize, {type InitInput} from './rapier_wasm3d.js';
let pending: Promise<void> | undefined;
/** Initialize once; concurrent callers share the same initialization. */
export function init(input?: InitInput | Promise<InitInput>): Promise<void> {
 return pending ??= initialize({module_or_path: input ?? Uint8Array.from(atob(${JSON.stringify(wasm.toString('base64'))}), c => c.charCodeAt(0))}).then(() => {}).catch(error => {pending=undefined; throw error;});
}\n`);
mkdirSync('dist',{recursive:true});
const result=await Bun.build({entrypoints:[join(generated,'rapier.ts')],target:'browser',format:'esm',minify:true});
if(!result.success || result.outputs.length!==1) throw Error(result.logs.join('\n'));
writeFileSync('dist/rapier.mjs',await result.outputs[0]!.arrayBuffer().then(a=>Buffer.from(a)));
const infoResult=await Bun.build({entrypoints:[join(generated,'build-info.ts')],target:'browser',format:'esm',minify:true});
if(!infoResult.success||infoResult.outputs.length!==1)throw Error('Build identity module failed');
writeFileSync('dist/build-info.mjs',await infoResult.outputs[0]!.arrayBuffer().then(a=>Buffer.from(a)));
writeFileSync('.absolutejs/api-tsconfig.json',JSON.stringify({compilerOptions:{target:'ES2022',module:'ESNext',moduleResolution:'bundler',declaration:true,emitDeclarationOnly:true,strict:false,skipLibCheck:true,outDir:resolve('dist/types'),rootDir:generated},include:[generated+'/**/*.ts']}));
const types=Bun.spawnSync(['bun','run','tsc','-p','.absolutejs/api-tsconfig.json'],{stdout:'inherit',stderr:'inherit'});
if(types.exitCode) throw Error('Declaration build failed');
copyFileSync(join(generated,'rapier_wasm3d.d.ts'),'dist/types/rapier_wasm3d.d.ts');
writeFileSync('dist/provenance.json',JSON.stringify(buildInfo,null,2)+'\n');
copyFileSync('absolutejs/README.md','README.md');
console.log('Built standalone API, declarations and provenance.');
