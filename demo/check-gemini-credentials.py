"""Read-only credential check; hidden input -> SSH stdin -> isolated process env.

No credential persistence, inference, provider rotation or publication.
"""
import getpass
import json
import shlex
import subprocess

WORKER = r'''
import json,os,urllib.request,urllib.error
key=os.environ['GEMINI_API_KEY']
request=urllib.request.Request('https://generativelanguage.googleapis.com/v1beta/models',headers={'x-goog-api-key':key})
try:
    with urllib.request.urlopen(request,timeout=20) as response:
        data=json.load(response)
    models=[m['name'] for m in data.get('models',[]) if 'generateContent' in m.get('supportedGenerationMethods',[])]
    print(json.dumps({'http':200,'modelCount':len(models),'flashModels':[m for m in models if 'flash' in m.lower()],'hasMorePages':bool(data.get('nextPageToken'))}))
except urllib.error.HTTPError as error:
    try:
        detail=json.loads(error.read(16384)).get('error',{})
        reasons=[d.get('reason') for d in detail.get('details',[]) if d.get('reason')]
        print(json.dumps({'http':error.code,'status':detail.get('status'),'reasons':reasons}))
    except Exception:
        print(json.dumps({'http':error.code,'status':'UNREADABLE_ERROR'}))
except Exception as error:
    print(json.dumps({'status':type(error).__name__}))
'''

REMOTE = r'''
import sys,json,os,subprocess
payload=json.loads(sys.stdin.readline())
for index,key in enumerate(payload['keys'],1):
    env={**os.environ,'GEMINI_API_KEY':key}
    try:
        result=subprocess.run([sys.executable,'-c',payload['worker']],env=env,capture_output=True,text=True,timeout=25)
        output=json.loads(result.stdout)
    except Exception as error:
        output={'status':type(error).__name__}
    print(json.dumps({'credentialId':'key-%02d'%index,**output}),flush=True)
'''

if __name__ == '__main__':
    keys=json.loads(getpass.getpass('Credential JSON array (hidden): '))
    if not isinstance(keys,list) or not keys or not all(isinstance(k,str) and k.strip() for k in keys):
        raise SystemExit('Invalid credential input')
    result=subprocess.run(['ssh','-i','C:/Users/user/.ssh/contabo_ed25519','-o','BatchMode=yes','-o','IdentitiesOnly=yes',
        'root@5.104.80.117','python3 -c '+shlex.quote(REMOTE)],input=json.dumps({'keys':keys,'worker':WORKER})+'\n',
        capture_output=True,text=True,encoding='utf-8',timeout=200)
    # Print only allowlisted, structured summaries. Never relay raw SSH/provider output.
    for line in result.stdout.splitlines():
        value=json.loads(line)
        print(json.dumps({k:value[k] for k in ('credentialId','http','status','reasons','modelCount','flashModels','hasMorePages') if k in value}))
    if result.returncode:
        raise SystemExit('Remote credential check failed')
