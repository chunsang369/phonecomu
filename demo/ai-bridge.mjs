// Local inference bridge. The database and crawl workers remain on Contabo.
// Exposed to the server only through an authenticated SSH reverse tunnel.
import {createServer} from 'node:http'
import {configureDemo} from '../src/lib/demo/ai.mjs'
configureDemo()
createServer(async(req,res)=>{
 if(req.url==='/health'){res.writeHead(200,{'Content-Type':'application/json'});res.end('{"available":true}');return}
 if(req.method!=='POST'||req.url!=='/v1/chat/completions'){res.writeHead(404);res.end();return}
 try{
  let body='';for await(const chunk of req){body+=chunk;if(body.length>2000000)throw new Error('request size')}
  const upstream=await fetch(process.env.PHONE_AI_URL,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.PHONE_AI_KEY}`},body,signal:AbortSignal.timeout(125000)})
  res.writeHead(upstream.status,{'Content-Type':'application/json',...(upstream.headers.get('retry-after')?{'Retry-After':upstream.headers.get('retry-after')}:{})});res.end(await upstream.text())
 }catch{res.writeHead(502);res.end('{"error":"AI bridge unavailable"}')}
}).listen(31418,'127.0.0.1',()=>console.log('Inference bridge listening on loopback 31418'))
