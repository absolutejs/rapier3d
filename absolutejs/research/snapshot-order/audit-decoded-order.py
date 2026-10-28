from pathlib import Path
import hashlib,json
root=Path(__file__).resolve().parent
folder=root/'published-0160'
read=lambda p:json.loads(p.read_text())
a=read(folder/'decoded-initial.json');b=read(folder/'decoded-restored.json')
before=(folder/'32-fresh-initial.bin').read_bytes();after=(folder/'32-fresh-0.bin').read_bytes()
assert len(before)==len(after)==a['bytes']==b['bytes']
assert a['ranges']==b['ranges'] and a['queue_ranges']==b['queue_ranges']
wake=next(row for row in a['queue_ranges'] if row['field']=='multibody.to_wake_up')
differences=[i for i,(x,y) in enumerate(zip(before,after)) if x!=y]
assert differences and all(wake['start']<=i<wake['end'] for i in differences)
assert before[:wake['start']]==after[:wake['start']] and before[wake['end']:]==after[wake['end']:]
key=lambda row:(row['index'],row['generation'])
x=a['serialized_multibody_wake_order'];y=b['serialized_multibody_wake_order']
assert x!=y and sorted(x,key=key)==sorted(y,key=key)
assert a['serialized_multibody_join_order']==b['serialized_multibody_join_order']
result={'decodedField':'MultibodyJointSet.to_wake_up','fieldRange':wake,
        'changedByteOffsets':differences,'membershipExactlyUnchanged':True,
        'allBytesOutsideWakeSetExactlyUnchanged':True,
        'wakeOrderChangedAt':[i for i,(m,n) in enumerate(zip(x,y)) if m!=n],
        'sourceSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'inputHashes':{name:hashlib.sha256((folder/name).read_bytes()).hexdigest() for name in ['32-fresh-initial.bin','32-fresh-0.bin','decoded-initial.json','decoded-restored.json']}}
(root/'decoded-order-audit.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
