"""Start one authorized server cycle with a process-scoped secret, never a key file."""
import getpass
import json
import shlex
import subprocess

REMOTE = r'''
import sys,json,os,subprocess
from pathlib import Path
p=json.loads(sys.stdin.readline())
env={**os.environ,'GEMINI_API_KEY':p['key'],'GEMINI_MODEL':'gemini-3.6-flash','PHONE_DEMO':'1','PHONE_DEMO_DB':'/var/lib/phone-community-demo/community.sqlite'}
log=Path('/var/lib/phone-community-demo/rewrite-cycle-console.log')
with log.open('ab') as out:
    child=subprocess.Popen(['/usr/bin/flock','-n','/var/lib/phone-community-demo/batch.lock','/usr/bin/node','demo/rewrite-cycle.mjs','--run'],cwd='/opt/phone-community-demo',env=env,stdin=subprocess.DEVNULL,stdout=out,stderr=out,start_new_session=True)
print(json.dumps({'pid':child.pid,'log':str(log),'model':env['GEMINI_MODEL']}))
'''

if __name__=='__main__':
    key=getpass.getpass('API credential for this server process (hidden): ')
    response=subprocess.run(['ssh','-i','C:/Users/user/.ssh/contabo_ed25519','-o','BatchMode=yes','-o','IdentitiesOnly=yes','root@5.104.80.117','python3 -c '+shlex.quote(REMOTE)],input=json.dumps({'key':key})+'\n',encoding='utf-8',capture_output=True,timeout=30)
    if response.returncode:raise SystemExit('Server cycle launch failed')
    print(response.stdout.replace(key,'[REDACTED]'))
