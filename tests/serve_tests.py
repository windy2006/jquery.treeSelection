from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse
import argparse,json,re,urllib.request,urllib.error
ROOT=Path(__file__).resolve().parent.parent
PROJECT='jquery.treeSelection'
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
 def translate_path(self,path):
  path=urlparse(path).path
  if path in ('/core.html','/core.js'):relative='tests/'+path.lstrip('/')
  elif path.startswith('/case/default/'+PROJECT+'/'):relative=path[len('/case/default/'+PROJECT+'/'):]
  elif path.startswith('/case/default/tests/'):relative=path[len('/case/default/'):]
  else:return super().translate_path(path)
  result=(ROOT/relative).resolve()
  return str(result if result.is_relative_to(ROOT) else ROOT/'__not_found__')
 def end_headers(self):self.send_header('Cache-Control','no-store');super().end_headers()
 def do_POST(self):
  if PROJECT!='jquery.powerUpload' or self.path!='/test-upload':return self.send_error(404)
  raw=self.rfile.read(int(self.headers.get('Content-Length','0')))
  request=urllib.request.Request('http://localhost:8765/upload',data=raw,headers={'Content-Type':self.headers.get('Content-Type','')})
  try:response=urllib.request.urlopen(request)
  except urllib.error.HTTPError as error:response=error
  with response:
   raw=response.read();self.send_response(response.status);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(raw)));self.end_headers();self.wfile.write(raw)
   result=json.loads(raw);name=Path(result.get('src','')).name
   if re.fullmatch(r'[0-9a-f]{32}\.(png|jpg|gif|webp)',name):(ROOT/'uploads'/name).unlink(missing_ok=True)
 def log_message(self,*args):pass
if __name__=='__main__':
 parser=argparse.ArgumentParser();parser.add_argument('--port',type=int,default=8766);args=parser.parse_args()
 print(f'Open http://localhost:{args.port}/core.html',flush=True)
 ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()
