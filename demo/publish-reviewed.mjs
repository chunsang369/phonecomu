import {publishTick} from '../src/lib/demo/paced-publication.mjs'
import {syncPublic} from './sync-public.mjs'
import {setSetting,setting} from '../src/lib/demo/runtime.mjs'
import {applyReadyCommentUpdates} from '../src/lib/demo/source-refresh.mjs'
// No crawling and no inference; this worker only releases reviewed records.
try{const result=publishTick(),comments=applyReadyCommentUpdates();const due=Date.now()-Date.parse(setting('publicPostgresSync',{}).at||0)>60000;const sync=result.postId||comments||due?syncPublic():null;setSetting('publisherHeartbeat',new Date().toISOString());console.log(JSON.stringify({result,comments,sync}))}
catch(e){setSetting('publisherError',{at:new Date().toISOString(),error:e.message});throw e}
