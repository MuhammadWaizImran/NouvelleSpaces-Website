"""Snapshot existing layouts and catalog editable content without changing markup."""
from html.parser import HTMLParser
from html import unescape
from pathlib import Path
import json,re
ROOT=Path(__file__).resolve().parent.parent
fields=[]
class Catalog(HTMLParser):
 def __init__(self,text,page):
  super().__init__(convert_charrefs=False);self.text=text;self.page=page;self.stack=[];self.lines=[0];self.group={}
  for m in re.finditer('\n',text):self.lines.append(m.end())
 def pos(self):
  l,c=self.getpos();return self.lines[l-1]+c
 def utfpos(self,p):return len(self.text[:p].encode('utf-16-le'))//2
 def context(self):
  for tag,attrs in reversed(self.stack):
   if tag in ('section','header','footer','nav','dialog'):return attrs.get('id') or attrs.get('class','').split(' ')[0] or tag
  return 'General'
 def add(self,kind,label,value,start,end,extra=None):
  key=(kind,self.context(),value if isinstance(value,str) else json.dumps(value))
  if key not in self.group:
   f={'id':f'{self.page}-{len(fields)+1:04}','page':self.page,'section':self.context(),'kind':kind,'label':label[:100],'value':value,'ranges':[]}
   if extra:f.update(extra)
   self.group[key]=f;fields.append(f)
  self.group[key]['ranges'].append([self.utfpos(start),self.utfpos(end)])
 def excluded(self):return any(t in ('script','style','svg','title','noscript') or 'project-grid' in a.get('class','') or 'filter-bar' in a.get('class','') for t,a in self.stack)
 def handle_starttag(self,tag,attrs):
  a=dict(attrs);raw=self.get_starttag_text();start=self.pos()
  if not self.excluded():
   if tag=='img' and a.get('src') and 'favicon' not in a['src']:
    self.add('image',a.get('alt') or a.get('class') or 'Image',{'src':a['src'],'alt':a.get('alt','')},start,start+len(raw))
   if tag=='a' and a.get('href') and not a['href'].startswith('#'):
    m=re.search(r'\bhref="([^"]*)"',raw)
    if m:self.add('link',a.get('aria-label') or a['href'],unescape(a['href']),start+m.start(1),start+m.end(1))
  if tag not in ('area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr'):self.stack.append((tag,a))
 def handle_startendtag(self,tag,attrs):
  self.handle_starttag(tag,attrs)
  if self.stack and self.stack[-1][0]==tag:self.stack.pop()
 def handle_endtag(self,tag):
  for i in range(len(self.stack)-1,-1,-1):
   if self.stack[i][0]==tag:self.stack=self.stack[:i];break
 def handle_data(self,data):
  if self.excluded() or not self.stack:return
  clean=data.strip()
  if not clean or not re.search('[a-zA-Z]',clean):return
  if self.stack[-1][0] in ('html','head','body'):return
  start=self.pos()+len(data)-len(data.lstrip());end=start+len(clean)
  self.add('text',unescape(clean),unescape(clean),start,end)
# Convert character references into ordinary data in a single text chunk via a tokenizer
# HTMLParser(convert_charrefs=True) preserves offsets for data spans, including references.
for page,file in [('home','index.html'),('gallery','projects.html')]:
 text=(ROOT/file).read_text(encoding='utf-8');(ROOT/'cms/templates'/file).write_text(text,encoding='utf-8')
 parser=Catalog(text,page);parser.feed(text)
(ROOT/'cms/catalog.json').write_text(json.dumps(fields,indent=2,ensure_ascii=False),encoding='utf-8')
print(f'Cataloged {len(fields)} editable fields.')

