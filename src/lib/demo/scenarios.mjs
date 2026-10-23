import { devices, regions, carriers } from './catalog.mjs'

export const forbidden = /알뜰|mvno|가상이동통신/iu
export const normalize = (s) => s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
export function similarity(a, b) {
  const grams = (s) => { const n = normalize(s); return new Set(Array.from({ length: Math.max(1, n.length - 4) }, (_, i) => n.slice(i, i + 5))) }
  const x = grams(a), y = grams(b)
  return [...x].filter(v => y.has(v)).length / Math.max(1, Math.min(x.size, y.size))
}
const topics = ['요금제 유지 기간', '선택약정 할인', '공시지원금 비교', '할부 원금', '가족결합', '부가서비스 해지', '번호이동 시점', '기기변경 조건', '데이터 사용량', '배터리 관리', '사진 백업', '개통 확인', '통화 품질', '보증 기간', '저장 용량', '중고 보상', '월 청구서', '매장 방문 예약', '약정 만료', '자급제 비교']
const context = ['출퇴근 중 영상을 자주 보는 편', '와이파이를 주로 사용하는 편', '사진을 많이 남기는 편', '가족과 같은 통신사를 쓰는 중', '기존 휴대폰을 3년째 사용하는 중', '주말에만 매장에 갈 수 있는 상황', '작은 화면이 더 편한 편', '한 달 지출을 먼저 정하는 편', '출장 때문에 데이터를 많이 쓰는 편', '게임보다 통화와 메시지를 많이 쓰는 편']
const endings = ['다른 분들은 어떤 순서로 확인하셨나요?', '비교할 항목을 하나씩 메모해 두려고요.', '금액보다 조건을 먼저 정리하는 게 편하네요.', '같은 고민 중인 분이 계시면 의견 부탁드립니다.', '다음에는 변경 전후 청구서를 함께 살펴보려고 합니다.', '서두르지 않고 두 가지 조건을 나란히 적어보려 합니다.']

export function scenario(index, slug) {
  const device = devices[index % devices.length], region = regions[Math.floor(index / 8) % 8]
  const carrier = carriers[Math.floor(index / 64) % 3], topic = topics[Math.floor(index / 192) % topics.length]
  const situation = context[Math.floor(index / 7) % context.length], end = endings[Math.floor(index / 11) % endings.length]
  const amount = 45000 + (index % 18) * 3000
  const intros = {
    coordinate: [`${region} ${device} ${carrier} 방문 전, ${topic} 체크`, `${region}에서 ${device} 구매 조건을 알아보는 가상 방문 사례입니다. 저는 ${situation}이라 ${carrier}의 조건 중 ${topic}을 먼저 비교했어요.\n기기값과 요금제 유지 비용, 부가서비스를 각각 적어 두니 차이가 보였습니다.`],
    info: [`${device} · ${carrier} ${topic} 정리 노트`, `${device}를 고를 때 ${topic}도 같이 확인하면 비교하기 수월합니다.\n예시로 월 ${amount.toLocaleString('ko-KR')}원이라는 조건을 받았다면 단말 할부금이 포함된 금액인지부터 구분해 보세요. ${region}이라는 지역명만으로 조건이 같다고 볼 수는 없습니다.`],
    review: [`${region} ${carrier} ${device}, ${topic} 살펴본 후기`, `실제 구매를 뜻하지 않는 시연용 가상 후기입니다.\n${situation}인 구매자를 가정해 ${device} 상담 과정을 구성했습니다. ${topic}을 먼저 물어봤고, 월 ${amount.toLocaleString('ko-KR')}원 예산 안에서 기기값과 통신비를 따로 비교했습니다.\n상담 내용을 메모해 놓으니 다시 확인하기 편했습니다.`],
    qna: [`${carrier} ${device} ${topic}, 어떻게 확인하나요?`, `${region}에서 ${device}로 바꾸려고 알아보는 예시 질문입니다.\n${situation}인데 ${topic}이 조금 헷갈려요. 월 예산을 ${amount.toLocaleString('ko-KR')}원 정도로 잡는다면 어떤 항목부터 확인하는 게 좋을까요?`],
    free: [`${device} 쓰면서 문득 궁금해진 ${topic}`, `오늘 ${region}에서 이동하다 ${device} 이야기가 나왔어요.\n저는 ${situation}인데, ${carrier} 이용하시는 분들은 ${topic}을 얼마나 자주 확인하세요? 사소한 습관도 사람마다 다르더라고요.`],
    anonymous: [`${device} 고민 중인데 ${topic}까지 보니 머리 아프네`, `${region} 쪽에서 ${carrier} 조건 보는 중. ${situation}이라 크게 복잡할 줄 몰랐는데 ${topic}에서 막힘.\n일단 월 ${amount.toLocaleString('ko-KR')}원 기준으로 표부터 만들어 봤어요. 다들 이렇게 하나요?`],
    politics: [`${region} 생활 속 통신 정책, ${topic} 안내는 충분할까`, `가상 토론 주제입니다. 실제 인물의 발언이나 특정 정책 시행 사실을 전하는 글이 아닙니다.\n${device}와 ${carrier}의 ${topic}을 비교하는 시민 입장에서 어떤 정보가 더 잘 보이면 좋을지 생각해 봤습니다. ${situation}이라 설명 방식에 따라 이해하기 쉬운 정도가 달랐습니다.\n여러 조건을 같은 기준의 표로 공개하는 방식에 대해 어떻게 생각하시나요?`],
    notice: [`시연 안내 · ${region} ${device} ${topic}`, '이 홈페이지의 계정과 글은 판매용 로컬 시연 데이터입니다. 가격·가입일·활동 수치는 예시이며 실제 이용 실적이나 판매 조건이 아닙니다. 외부 자료를 재구성한 글에는 원본 출처를 표시합니다.'],
  }
  const [title, body] = intros[slug] || intros.info
  const comments = [
    { content: `${topic}은 상담 메모와 실제 안내문을 함께 보면 비교하기 편해요.`, parentIndex: null },
    { content: `저도 ${device} 기준으로 항목을 따로 적어봤어요. ${end}`, parentIndex: null },
    { content: '답변 감사합니다. 유지 기간이 끝나는 날짜도 표시해 두겠습니다.', parentIndex: 0 },
    { content: `지역만 보기보다 ${carrier} 가입 유형을 먼저 맞춰 비교해 보세요.`, parentIndex: 1 },
  ]
  return { title, content: `${body}\n\n${end}`, comments, region, carrier, device, generator: 'scenario' }
}
