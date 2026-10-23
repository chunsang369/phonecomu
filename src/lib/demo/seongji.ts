import { regions,demoQuotes } from './catalog.mjs'
import { demoPosts } from './queries'
import type { StoreReview,StoreSummary } from '@/lib/queries/seongji'
const storeId=(i:number)=>`d0000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`
export function demoStoreReviews():StoreReview[] {
  return demoPosts(3,1,40).posts.map((p,i)=>{
    const quote=demoQuotes[i*7%demoQuotes.length], region=regions.indexOf(quote.region)
    return {id:p.id,store_id:storeId(region),post_id:p.id,carrier:quote.carrier.replace(' ','') as string,device_name:quote.device,device_price:1200000,device_paid:quote.devicePaid,join_type:quote.joinType,discount_type:'공시지원금',pay_type:'현금완납',install_months:24,plan_price:quote.planPrice,plan_hold_months:6,plan_after_price:55000,addon_monthly:9900,addon_months:3,card_required:false,promise:i%5===0?'partial':'kept',rating_price:3+i%3,rating_service:4+i%2,rating_trust:3+i%3,purchased_on:p.created_at.slice(0,10),real_price:quote.devicePaid+(quote.planPrice-55000)*6+9900*3,hidden_cost:(quote.planPrice-55000)*6+9900*3,total_24m:quote.total24,comment:'판매용 시연을 위해 만든 가상 매장 평가입니다. 실제 매장이나 구매 실적이 아닙니다.',created_at:p.created_at,author_display_name:p.author?.display_name||'테스트 회원',author_username:p.author?.username||'',store_alias:`${quote.region} 예시 성지`,store_region:quote.region,store_district:'시연 지역'}
  })
}
export function demoStores():StoreSummary[] {
  const all=demoStoreReviews()
  return regions.map((region,i)=>{
    const r=all.filter(r=>r.store_id===storeId(i)),n=r.length,average=(key:'rating_price'|'rating_service'|'rating_trust')=>n?r.reduce((s,x)=>s+x[key],0)/n:null
    return {id:storeId(i),alias:`${region} 예시 성지`,region,district:'시연 지역',review_count:n,avg_price:average('rating_price'),avg_service:average('rating_service'),avg_trust:average('rating_trust'),avg_total:n?r.reduce((s,x)=>s+(x.rating_price+x.rating_service+x.rating_trust)/3,0)/n:null,kept_rate:n?r.filter(x=>x.promise==='kept').length/n:null,broken_count:0,last_review_at:r[0]?.created_at||null,latest_device:r[0]?.device_name||null,latest_real_price:r[0]?.real_price||null}
  })
}
