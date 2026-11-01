import {beforeAll,expect,test} from 'bun:test';
import R from '../../dist/rapier.mjs';
import fixture from './fixtures/captured-convex-exports.json';
beforeAll(async()=>{await R.init();});
const view=new DataView(new ArrayBuffer(4));
/** Exact Float32 value in units of 2^-149. No geometric epsilon. */
function integer(value:number){
 view.setFloat32(0,value,true);if(view.getFloat32(0,true)!==value||!Number.isFinite(value))throw Error('Not finite Float32');
 const bits=view.getUint32(0,true),exponent=(bits>>>23)&255;
 const significand=BigInt((bits&0x7fffff)|(exponent?0x800000:0));
 return (bits>>>31?-1n:1n)*(significand<<BigInt(Math.max(0,exponent-1)));
}
type V=[bigint,bigint,bigint];
const sub=(a:V,b:V):V=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const cross=(a:V,b:V):V=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const dot=(a:V,b:V)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
function vectors(p:ArrayLike<number>){const rows:V[]=[];for(let i=0;i<p.length;i+=3)rows.push([integer(p[i]!),integer(p[i+1]!),integer(p[i+2]!)]);return rows;}
function certify(p:Float32Array,indices:Uint32Array,original:number[]){
 const vertices=vectors(p),points=vectors(original),edges=new Map<string,number>();let volume=0n;
 expect(indices.length%3).toBe(0);expect(indices.length).toBeGreaterThanOrEqual(12);
 for(let i=0;i<indices.length;i+=3){
  const ids=Array.from(indices.subarray(i,i+3));expect(ids.every(v=>v<vertices.length)).toBe(true);
  const [a,b,c]=ids.map(v=>vertices[v]!) as [V,V,V],normal=cross(sub(b,a),sub(c,a));
  expect(normal.some(v=>v!==0n)).toBe(true);volume+=dot(a,cross(b,c));
  for(const point of points)expect(dot(normal,sub(point,a))<=0n).toBe(true);
  for(let k=0;k<3;k++){const a=ids[k]!,b=ids[(k+1)%3]!,key=`${a}/${b}`;edges.set(key,(edges.get(key)??0)+1);}
 }
 expect(volume>0n).toBe(true);
 for(const [key,count]of edges){expect(count).toBe(1);expect(edges.get(key.split('/').reverse().join('/'))).toBe(1);}
}
test('exact test predicate distinguishes thin outward and reversed planes',()=>{
 const p=Float32Array.from([0,0,0,1,0,0,0,1,0,0,0,2**-30]);
 const i=Uint32Array.from([1,2,3,0,2,1,0,1,3,0,3,2]);
 certify(p,i,Array.from(p));
 const wrong=i.slice();[wrong[1],wrong[2]]=[wrong[2]!,wrong[1]!];
 expect(()=>certify(p,wrong,Array.from(p))).toThrow();
});
for(const [member,f]of fixture.members.entries())test(`convex export ${member} is a closed outward boundary of unchanged stored points`,()=>{
 const world=new R.World({x:0,y:0,z:0});
 try{
  const desc=f.inputIndices?R.ColliderDesc.convexMesh(Float32Array.from(f.inputPositions),Uint32Array.from(f.inputIndices)):R.ColliderDesc.convexHull(Float32Array.from(f.inputPositions));
  expect(desc).not.toBeNull();const collider=world.createCollider(desc!.setDensity(0));
  const before=world.takeSnapshot(),mass=collider.mass();
  const p=collider.vertices()!,i=collider.indices()!;
  certify(p,i,f.positions);
  const original=new Set(Array.from({length:f.inputPositions.length/3},(_,j)=>f.inputPositions.slice(j*3,j*3+3).join(',')));
  for(let j=0;j<p.length;j+=3)expect(original.has(Array.from(p.subarray(j,j+3)).join(','))).toBe(true);
  expect(collider.mass()).toBe(mass);expect(world.takeSnapshot()).toEqual(before);
  expect(collider.vertices()).toEqual(p);expect(collider.indices()).toEqual(i);
 }finally{world.free();}
});
