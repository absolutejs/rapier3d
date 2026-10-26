import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const result=await Bun.build({entrypoints:['absolutejs/scripts/browser-worker-entry.ts'],target:'browser',format:'esm'});
if(!result.success||result.outputs.length!==1)throw Error('Worker build failed');
const worker=await result.outputs[0]!.text();
const server=Bun.serve({hostname:'127.0.0.1',port:0,fetch(req){return new URL(req.url).pathname==='/worker.js'?new Response(worker,{headers:{'Content-Type':'text/javascript'}}):new Response('<!doctype html><title>CPU-only contact worker</title>',{headers:{'Content-Type':'text/html'}});}});
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
 writeFileSync('.absolutejs/logs/browser-result.json',JSON.stringify({gpu:false,result},null,2)+'\n');
 if(!(result as {passed:boolean}).passed)throw Error(JSON.stringify(result));
 console.log(result);
}finally{await browser?.close();await server.stop(true);}
