import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const result=await Bun.build({entrypoints:['absolutejs/scripts/browser-worker-entry.ts'],target:'browser',format:'esm'});
if(!result.success||result.outputs.length!==1)throw Error('Worker build failed');
const worker=await result.outputs[0]!.text();
const simplexFixture=readFileSync(new URL('../tests/fixtures/simplex-floor-hull-before.bin',import.meta.url));
const predictiveFixtures=new Map(['/predictive-floor.bin','/predictive-fragment.bin'].map((path,i)=>[path,readFileSync(new URL(i===0?'../research/predictive-recycle/fixtures/tree-1-stage-3-480-before.bin':'../research/predictive-recycle/fixtures/tree-4-stage-3-960-before.bin',import.meta.url))]));
const server=Bun.serve({hostname:'127.0.0.1',port:0,fetch(req){const predictive=predictiveFixtures.get(new URL(req.url).pathname);if(predictive)return new Response(predictive,{headers:{'Content-Type':'application/octet-stream'}});return new URL(req.url).pathname==='/simplex-fixture.bin'?new Response(simplexFixture,{headers:{'Content-Type':'application/octet-stream'}}):new URL(req.url).pathname==='/worker.js'?new Response(worker,{headers:{'Content-Type':'text/javascript'}}):new Response('<!doctype html><title>CPU-only contact worker</title>',{headers:{'Content-Type':'text/html'}});}});
let browser;
try {
 browser=await chromium.launch({headless:true,args:['--disable-gpu']});
 const page=await browser.newPage();
 await page.goto(`http://127.0.0.1:${server.port}`);
 const result=await page.evaluate(()=>new Promise((resolve,reject)=>{
  const w=new Worker('/worker.js',{type:'module'});
  const timer=setTimeout(()=>{w.terminate();reject(Error('Worker exceeded 20s budget'));},20000);
  w.onmessage=e=>{clearTimeout(timer);w.terminate();resolve(e.data);};
  w.onerror=e=>{clearTimeout(timer);w.terminate();reject(Error(e.message));};
 }));
 mkdirSync('.absolutejs/logs',{recursive:true});
 writeFileSync('.absolutejs/logs/browser-result.json',JSON.stringify({gpu:false,result},null,2)+'\n');
 if(!(result as {passed:boolean}).passed)throw Error(JSON.stringify(result));
 console.log(result);
}finally{await browser?.close();await server.stop(true);}
