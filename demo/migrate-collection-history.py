"""Recover pre-tracking batch membership from this service's own journal, once."""
import datetime
import json
import sqlite3
import subprocess
import uuid


def migrate():
    db = sqlite3.connect('/var/lib/phone-community-demo/community.sqlite')
    if db.execute('SELECT count(*) FROM collection_batches').fetchone()[0]:
        print(json.dumps({'skipped': 'batch history already exists'}))
        return
    journal = subprocess.run(['journalctl', '-u', 'phone-community-batch.service', '-o', 'json', '--no-pager'], capture_output=True, text=True, check=True)
    batches = []
    for line in journal.stdout.splitlines():
        entry = json.loads(line)
        message = entry.get('MESSAGE', '')
        if not isinstance(message, str):
            continue
        at = datetime.datetime.fromtimestamp(int(entry['__REALTIME_TIMESTAMP']) / 1e6, datetime.timezone.utc).isoformat()
        if message.startswith('Starting phone-community-batch.service'):
            if batches and batches[-1]['finished'] is None:
                batches[-1].update(finished=at, status='interrupted')
            batches.append({'id': str(uuid.uuid5(uuid.NAMESPACE_URL, 'phone-collection:' + at)), 'started': at, 'finished': None, 'status': 'running'})
        elif batches and (message.startswith('Finished phone-community-batch.service') or message.startswith('Failed to start phone-community-batch.service')):
            batches[-1].update(finished=at, status='done' if message.startswith('Finished') else 'failed')
    with db:
        for b in batches:
            db.execute('INSERT INTO collection_batches VALUES(?,?,?,?)', (b['id'], b['started'], b['finished'], b['status']))
            if b['finished']:
                db.execute('INSERT OR IGNORE INTO collection_batch_items SELECT id,? FROM collected WHERE julianday(collected_at)>=julianday(?) AND julianday(collected_at)<julianday(?)', (b['id'], b['started'], b['finished']))
    print(json.dumps({'batches': len(batches), 'assigned': db.execute('SELECT count(*) FROM collection_batch_items').fetchone()[0], 'recent': db.execute('SELECT b.started_at,count(i.source_record_id) FROM collection_batches b LEFT JOIN collection_batch_items i ON i.batch_id=b.id GROUP BY b.id ORDER BY b.started_at DESC LIMIT 4').fetchall()}))


if __name__ == '__main__':
    migrate()
