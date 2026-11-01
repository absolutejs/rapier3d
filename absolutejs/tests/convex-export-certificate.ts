const check=(condition:boolean,message:string)=>{if(!condition)throw Error(message);};
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
export function certifyConvexBoundary(p:Float32Array,indices:Uint32Array,original:number[]){
 const vertices=vectors(p),points=vectors(original),edges=new Map<string,number>();let volume=0n;
 check(indices.length%3===0&&indices.length>=12,'Invalid triangles');
 for(let i=0;i<indices.length;i+=3){
  const ids=Array.from(indices.subarray(i,i+3));check(ids.every(v=>v<vertices.length),'Invalid index');
  const [a,b,c]=ids.map(v=>vertices[v]!) as [V,V,V],normal=cross(sub(b,a),sub(c,a));
  check(normal.some(v=>v!==0n),'Degenerate triangle');volume+=dot(a,cross(b,c));
  for(const point of points)check(dot(normal,sub(point,a))<=0n,'Input outside oriented facet');
  for(let k=0;k<3;k++){const a=ids[k]!,b=ids[(k+1)%3]!,key=`${a}/${b}`;edges.set(key,(edges.get(key)??0)+1);}
 }
 check(volume>0n,'Nonpositive volume');
 for(const [key,count]of edges){check(count===1&&edges.get(key.split('/').reverse().join('/'))===1,'Unpaired oriented edge');}
}
