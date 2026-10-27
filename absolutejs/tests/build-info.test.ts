import {expect,test} from 'bun:test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {buildInfo} from '@absolutejs/rapier3d/build-info';
import R,{buildInfo as rootInfo} from '@absolutejs/rapier3d';

test('build identity matches the actual package and qualified native bytes',()=>{
 const pkg=JSON.parse(readFileSync('package.json','utf8'));
 const wasm=readFileSync('.absolutejs/api/rapier_wasm3d_bg.wasm');
 expect(buildInfo.packageName).toBe(pkg.name);
 expect(buildInfo.packageVersion).toBe(pkg.version);
 const lock=Bun.TOML.parse(readFileSync('bindings/typescript/Cargo.lock','utf8')) as {package:{name:string;version:string;source?:string}[]};
 const collision=lock.package.filter(p=>p.name==='parry3d');
 expect(collision).toHaveLength(1);
 expect(buildInfo.collisionLibraryVersion).toBe(collision[0]!.version);
 expect(buildInfo.collisionSource).toBe(collision[0]!.source);

 expect(buildInfo.wasmSha256).toBe(createHash('sha256').update(wasm).digest('hex'));
 expect(buildInfo.wasmBytes).toBe(wasm.length);
 expect(buildInfo).toEqual(JSON.parse(readFileSync('dist/provenance.json','utf8')));
 expect(rootInfo).toEqual(buildInfo);
 expect(R.buildInfo).toBe(rootInfo);
 expect(Object.isFrozen(buildInfo)).toBe(true);
 expect(()=>{(buildInfo as any).packageVersion='spoof';}).toThrow();
 expect(buildInfo.packageVersion).toBe(pkg.version);
});

test('diagnostic identity imports independently of the physics runtime',()=>{
 const source=readFileSync('dist/build-info.mjs','utf8');
 expect(source.length).toBeLessThan(2048);
 expect(source).not.toMatch(/WebAssembly|atob\(|rapier\.mjs|\/home\//);
 const child=Bun.spawnSync(['bun','-e',`globalThis.WebAssembly = new Proxy({}, {get(){throw Error('WASM touched');}}); const {buildInfo}=await import('@absolutejs/rapier3d/build-info'); if(buildInfo.schemaVersion!==1)throw Error('Wrong identity');`],{stdout:'pipe',stderr:'pipe'});
 expect(child.exitCode).toBe(0);
 expect(child.stderr.toString()).toBe('');
});
