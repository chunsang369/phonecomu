"""Explicit bounded cross-key diagnosis, not an automatic quota fallback router."""
import concurrent.futures
import argparse
import getpass
import importlib.util
import json
from pathlib import Path
import shlex
import subprocess
import time

spec=importlib.util.spec_from_file_location('diagnostic',Path(__file__).with_name('check-gemini-rewrite.py'))
diagnostic=importlib.util.module_from_spec(spec)
spec.loader.exec_module(diagnostic)

def check(keys,index,model,repair=False,variants=False):
    payload={'key':keys[index-1],'credentialId':f'key-{index:02d}','model':model,'repair':repair,'variants':variants}
    run=subprocess.run(['ssh','-i','C:/Users/user/.ssh/contabo_ed25519','-o','BatchMode=yes','-o','IdentitiesOnly=yes',
        'root@5.104.80.117','cd /opt/phone-community-demo && python3 -c '+shlex.quote(diagnostic.REMOTE)],
        input=json.dumps(payload)+'\n',text=True,encoding='utf-8',capture_output=True,timeout=165)
    if run.returncode: return {'credentialId':payload['credentialId'],'model':model,'status':'REMOTE_FAILURE'}
    # Redact all supplied keys before any output or diagnostic persistence.
    text=run.stdout
    for key in keys:text=text.replace(key,'[REDACTED]')
    return json.loads(text)

def model_controls(results):
    return [int(r['credentialId'].split('-')[1]) for r in results if r.get('http')==503][:2]

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--lower-models',action='store_true')
    parser.add_argument('--repair',action='store_true')
    parser.add_argument('--lite-variants',action='store_true')
    args=parser.parse_args()
    keys=json.loads(getpass.getpass('Seven credentials JSON (hidden): '))
    if not isinstance(keys,list) or len(keys)!=7 or not all(isinstance(k,str) and k.strip() for k in keys):
        raise SystemExit('Expected seven credentials')
    results=[]
    path=Path('.demo')/('gemini-key-comparison-'+time.strftime('%Y%m%d-%H%M%S')+'.json')
    def save(result):
        results.append(result)
        path.parent.mkdir(exist_ok=True)
        path.write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
        print(json.dumps(result,ensure_ascii=False),flush=True)
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        plan=[(4,'gemini-3.1-flash-lite')] if args.lite_variants or (args.repair and args.lower_models) else ([(3,'gemini-3.6-flash')] if args.repair else ([(3,'gemini-3.6-flash'),(4,'gemini-3.1-flash-lite')] if args.lower_models else [(i,'gemini-3.8-flash') for i in range(2,8)]))
        jobs=[pool.submit(check,keys,i,model,args.repair,args.lite_variants) for i,model in plan]
        for job in concurrent.futures.as_completed(jobs):
            save(job.result())
    # Only compare a different model for 503, never for 429/auth/access restrictions.
    for index in ([] if args.lower_models or args.repair or args.lite_variants else model_controls(results)):
        save(check(keys,index,'gemini-3.6-flash'))
    print(json.dumps({'reportPath':str(path.resolve()),'requests':len(results)}),flush=True)
