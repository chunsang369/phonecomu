/** External AI generation is disabled; preserve callers with a clear error. */
export async function generateContent(_options) { throw new Error('FreeLLMAPI 연결 중지. 현재 ChatGPT에서 재구성하고 검수한 자료만 등록합니다.') }
