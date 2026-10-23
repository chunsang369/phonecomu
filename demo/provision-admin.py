"""Provision the sole administrator via SSH; password is accepted only by hidden prompt."""
import base64
import getpass
import hashlib
import json
import os
import subprocess

REMOTE = r'''
import json, os, subprocess, sys
from pathlib import Path
item=json.load(sys.stdin)
assert item['username']=='umjc' and item['hash'].startswith('scrypt$')
quote=lambda s: "'"+s.replace("'","''")+"'"
sql="""BEGIN;
UPDATE profiles SET role='member',updated_at=now() WHERE role='admin' AND lower(username)<>'umjc';
INSERT INTO profiles(username,display_name,password_hash,role,status,is_test)
VALUES('umjc','umjc',%s,'admin','active',false)
ON CONFLICT(lower(username)) DO UPDATE SET password_hash=excluded.password_hash,role='admin',status='active',is_test=false,updated_at=now();
CREATE UNIQUE INDEX IF NOT EXISTS sole_community_administrator ON profiles(role) WHERE role='admin';
COMMIT;
SELECT username,role,status FROM profiles WHERE role='admin';
""" % quote(item['hash'])
r=subprocess.run(['runuser','-u','postgres','--','psql','-X','-v','ON_ERROR_STOP=1','-q','-d','phonecommunity'],input=sql,text=True,capture_output=True)
if r.returncode: raise SystemExit('Administrator transaction failed (no credentials logged)')
path=Path('/etc/phone-community-admin.env')
fd=os.open(path,os.O_WRONLY|os.O_CREAT|os.O_TRUNC,0o600)
os.fchmod(fd,0o600)
with os.fdopen(fd,'w') as f: f.write('COMMUNITY_ADMIN_USERNAME=umjc\nCOMMUNITY_ADMIN_PASSWORD_HASH='+item['hash']+'\n')
print(r.stdout.strip())
print('Server environment file stored with mode 0600; password hash only.')
'''

if __name__ == '__main__':
    password = getpass.getpass('Administrator password (hidden): ')
    salt = os.urandom(16)
    digest = hashlib.scrypt(password.encode(), salt=salt, n=16384, r=8, p=1, dklen=64)
    payload = {'username':'umjc','hash':'scrypt$'+base64.b64encode(salt).decode()+'$'+base64.b64encode(digest).decode()}
    encoded = base64.b64encode(REMOTE.encode()).decode()
    result = subprocess.run(['ssh','-i','C:/Users/user/.ssh/contabo_ed25519','-o','BatchMode=yes','-o','IdentitiesOnly=yes','root@5.104.80.117',
        'python3 -c "import base64;exec(base64.b64decode(\''+encoded+'\'))"'], input=json.dumps(payload),text=True,capture_output=True)
    print(result.stdout)
    if result.returncode: raise SystemExit('SSH/admin provisioning failed; no password was printed.')
