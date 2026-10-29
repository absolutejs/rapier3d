from pathlib import Path
import gzip,hashlib,json,shutil
root=Path(__file__).resolve().parent
cache=root.parents[2]/'.cache/terrain-solver-reports'
cache.mkdir(parents=True,exist_ok=True)
rows=[]
for name in ['controls','softness-controls','initial-variant-0','initial-variant-5']:
 source=root/(name+'.json'); backup=cache/source.name
 raw=(source if source.exists() else backup).read_bytes()
 packed=gzip.compress(raw,compresslevel=6,mtime=0)
 assert gzip.decompress(packed)==raw
 dest=root/(name+'.json.gz');dest.write_bytes(packed)
 rows.append({'name':name,'uncompressedBytes':len(raw),'uncompressedSha256':hashlib.sha256(raw).hexdigest(),'archiveBytes':len(packed),'archiveSha256':hashlib.sha256(packed).hexdigest(),'losslessRoundtrip':True})
 if source.exists():shutil.move(source,backup)
(root/'evidence-archives.json').write_text(json.dumps({'scope':'Lossless compressed native diagnostic evidence; raw copies remain in checkout cache','rows':rows},indent=2)+'\n')
