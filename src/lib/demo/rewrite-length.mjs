// Counts Unicode characters, including spaces and newlines, after HTML is removed upstream.
export const characterCount=text=>Array.from(text.replace(/\r\n/g,'\n')).length
export function rewriteLengthRule(text) {
 const original=characterCount(text),clamped=Math.min(2000,Math.max(10,original))
 const minimumRate=0.30-(clamped-10)/1990*0.27
 const minimumDifference=Math.ceil(original*minimumRate),maximumDifference=Math.ceil(original*0.30)
 return {original,minimumRate,minimumDifference,maximumDifference,shorter:[Math.max(10,original-maximumDifference),original-minimumDifference],longer:[original+minimumDifference,original+maximumDifference]}
}
export function checkRewriteLength(original,rewritten) {
 const rule=rewriteLengthRule(original),length=characterCount(rewritten),difference=Math.abs(length-rule.original)
 return {...rule,length,difference,rate:difference/Math.max(1,rule.original),valid:difference>=rule.minimumDifference&&difference<=rule.maximumDifference}
}
