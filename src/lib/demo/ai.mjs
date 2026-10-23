// External inference is disabled by the user's explicit instruction.
export function configureDemo() { process.env.PHONE_DEMO='1' }
export async function askJson(_system,_data,_maxTokens) { throw new Error('외부 AI API 연결 중지: 현재 ChatGPT에서 검수한 결과를 import-reviewed.mjs로 등록하세요.') }
