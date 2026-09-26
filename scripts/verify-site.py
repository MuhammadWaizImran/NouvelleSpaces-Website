"""Check local routes and every published page/project asset. Start npm start first."""
import json
import re
import sys
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.error import HTTPError

root = Path(__file__).resolve().parent.parent
base = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:3000'

def request(path, expected=200, headers=None):
    try:
        response = urlopen(Request(base + path, headers=headers or {}))
        status = response.status
        body = response.read()
    except HTTPError as error:
        status, body = error.code, error.read()
    assert status == expected, (path, status, expected)
    return body

for route in ['/', '/projects', '/projects/', '/projects.html']:
    text = request(route).decode('utf-8-sig')
    assert '<main' in text and 'Nouvelle Spaces' in text
    if 'projects' in route:
        assert 'Spaces with' in text and 'project-viewer' in text

paths = set()
for page in ['index.html', 'projects.html']:
    text = (root / page).read_text(encoding='utf-8')
    if page == 'projects.html':
        assert text.count('<h1 ') + text.count('<h1>') == 1
    ids = re.findall(r'(?<![\w-])id="([^"]+)"', text)
    assert len(ids) == len(set(ids)), 'Duplicate IDs'
    for value in re.findall(r'(?:href|src)="([^"]+)"', text):
        if value == '#':
            continue
        if value.startswith('#'):
            assert value[1:] in ids, (page, value)
        elif value.startswith(('/', './', 'assets/')):
            paths.add('/' + value.split('#')[0].removeprefix('./').lstrip('/'))
    for srcset in re.findall(r'srcset="([^"]+)"', text):
        paths.update('/' + part.strip().split()[0].removeprefix('./').lstrip('/') for part in srcset.split(',') if not part.strip().startswith('http'))

data = json.loads((root / 'assets/projects.json').read_text(encoding='utf-8'))
assert len(data) == 22
assert {n for p in data for n in p.get('pdfPages', [])} == set(range(5, 58)), 'Missing PDF project page'
assert {i['source']['page'] for p in data for i in p['images'] if 'page' in i['source']} == set(range(5, 58)), 'Missing page imagery'
gallery = (root / 'projects.html').read_text(encoding='utf-8')
assert gallery.count('class="project-card"') == len(data)
originals = []
for project in data:
    for image in project['images']:
        originals.append(image['src'])
        assert image['alt'] and image['width'] > 0 and image['height'] > 0
        from PIL import Image
        with Image.open(root / image['src'].lstrip('/')) as original:
            assert original.size == (image['width'], image['height'])
        paths.add(image['src'])
        paths.update(v['src'] for v in image['variants'])
assert len(originals) == len(set(originals)), 'Duplicated gallery image'
for path in sorted(paths):
    request(path)
for path in ['/missing-page', '/.env.local', '/server.js', '/assets/../.env.local', '/%invalid']:
    request(path, 400 if path == '/%invalid' else 404)
asset = originals[0]
assert len(request(asset, 206, {'Range': 'bytes=0-15'})) == 16
request(asset, 416, {'Range': 'bytes=999999999-1000000000'})
request(asset, 416, {'Range': 'bytes=bad'})
print(f'PASS: routes, anchors, metadata, {len(paths)} resources, {len(originals)} unique project images, 404s and range handling.')
