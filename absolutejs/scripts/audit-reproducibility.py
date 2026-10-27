"""Compare independent native builds, distinguishing compiler metadata from shipped bytes."""
import argparse,hashlib,json,subprocess
from pathlib import Path
p=argparse.ArgumentParser()
p.add_argument('independent',type=Path);p.add_argument('output',type=Path)
p.add_argument('--primary-source',type=Path,required=True);p.add_argument('--independent-source',type=Path,required=True)
a=p.parse_args();root=Path(__file__).resolve().parents[2];other=a.independent.resolve()
h=lambda data:hashlib.sha256(data).hexdigest()
def sections(data):
    assert data[:8]==b'\0asm\1\0\0\0','Expected WASM 1'
    position=8;rows=[]
    def integer():
        nonlocal position
        result=shift=0
        while True:
            assert position<len(data) and shift<35,'Invalid section size'
            byte=data[position];position+=1;result|=(byte&127)<<shift
            if byte<128:return result
            shift+=7
    while position<len(data):
        kind=data[position];position+=1;size=integer();end=position+size
        assert end<=len(data),'Truncated section'
        payload=data[position:end];name=None
        if kind==0:
            length=integer();assert position+length<=end
            name=data[position:position+length].decode()
        rows.append({'kind':kind,'name':name,'bytes':size,'sha256':h(payload)});position=end
    return rows
raw='.cache/target/wasm32-unknown-unknown/release/rapier_wasm3d.wasm'
x=(root/raw).read_bytes();y=(other/raw).read_bytes();sx=sections(x);sy=sections(y)
assert [s for s in sx if s['kind']]!=[ ],'No executable sections'
assert [s for s in sx if s['kind']]==[s for s in sy if s['kind']],'Executable/data sections differ'
if x!=y:
    assert [s['name'] for s in sx if not s['kind']]==['__wasm_bindgen_unstable']
    assert [s['name'] for s in sy if not s['kind']]==['__wasm_bindgen_unstable']
native='.absolutejs/api/rapier_wasm3d_bg.wasm';n=(root/native).read_bytes();assert n==(other/native).read_bytes(),'Packaged native differs'
files=lambda directory:{str(f.relative_to(directory)):h(f.read_bytes()) for f in directory.rglob('*') if f.is_file()}
distribution=files(root/'dist');assert distribution and distribution==files(other/'dist'),'Distribution differs'
m=json.loads(a.primary_source.read_text());q=json.loads(a.independent_source.read_text());assert m['inputs'].keys()==q['inputs'].keys()
differences=[k for k in m['inputs'] if m['inputs'][k]!=q['inputs'][k]];assert set(differences)<={'README.md'},differences
result={'schemaVersion':1,'auditSourceSha256':h(Path(__file__).read_bytes()),'independentCheckout':str(other),'separateTargetDirectories':(root/'.cache/target').resolve()!=(other/'.cache/target').resolve(),'allDistributionFilesIdentical':True,'distributionFiles':len(distribution),'packagedNativeSha256':h(n),'packagedNativeBytes':len(n),'rawIntermediateIdentical':x==y,'rawExecutableAndDataSectionsIdentical':True,'rawDifferenceOnly':None if x==y else '__wasm_bindgen_unstable custom metadata','rawPrimarySha256':h(x),'rawIndependentSha256':h(y),'primarySections':sx,'independentSections':sy,'sourceInputDifferences':differences,'primarySourceContentSha256':m['contentSha256'],'independentSourceContentSha256':q['contentSha256'],'toolchain':{name:subprocess.check_output([name,'--version'],text=True).strip() for name in ['bun','rustc','cargo','python3']}}
assert result['separateTargetDirectories'],'Independent target required'
a.output.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if not k.endswith('Sections')},indent=2))
