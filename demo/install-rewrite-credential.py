"""Bind the already-authorized community connector to a host-encrypted systemd credential.

No credential value is printed, passed as an argument, or written as plaintext.
The manuscript bot and its connector configuration are left intact.
"""
import os
from pathlib import Path
import subprocess
import yaml

destination=Path('/etc/credstore.encrypted/phone-community-gemini')
if destination.exists():
    print('Existing encrypted community credential retained')
else:
    config=yaml.safe_load(Path('/opt/cliproxy/config.yaml').read_text())
    groups=[g for g in config.get('api-keys',{}).get('gemini',[]) if g.get('name')=='phone-community-gemini']
    if len(groups)!=1 or len(groups[0].get('keys',[]))!=1:
        raise SystemExit('Expected one existing authorized community connector; no credential guessing')
    secret=groups[0]['keys'][0]['api-key']
    destination.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
    result=subprocess.run(['systemd-creds','encrypt','--with-key=host','--name=gemini','-',str(destination)],input=secret.encode(),stdout=subprocess.DEVNULL,stderr=subprocess.PIPE)
    if result.returncode:raise SystemExit('Managed credential encryption failed')
    os.chmod(destination,0o600)
    print('Existing community connector bound to encrypted systemd credential')
