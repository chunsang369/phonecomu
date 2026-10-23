export const regions = ['서울', '경기', '인천', '부산', '대구', '대전', '광주', '울산']
export const carriers = ['SKT', 'KT', 'LG U+']
export const devices = ['갤럭시 S26', '갤럭시 S26 울트라', '갤럭시 Z 플립8', '갤럭시 Z 폴드8', '아이폰 18', '아이폰 18 프로', '아이폰 17', '갤럭시 S25']
export const boardDefinitions = [
  ['coordinate', '휴대폰 성지', '지역별 방문 정보와 구매 조건을 나눠요.'],
  ['info', '휴대폰 정보', '공시지원금·선택약정·기기 사용 정보를 모아요.'],
  ['review', '구매 후기', '구매 과정과 사용 경험을 공유해요.'],
  ['qna', '질문답변', '헷갈리는 구매 조건, 함께 확인해요.'],
  ['free', '자유게시판', '휴대폰 이야기부터 소소한 일상까지.'],
  ['anonymous', '익명게시판', '닉네임 없이 편하게 나누는 이야기.'],
  ['politics', '정치·시사', '통신 정책과 생활 속 공공 이슈를 토론해요.'],
  ['notice', '공지사항', '커뮤니티와 로컬 시연 이용 안내.'],
]
// 시연 가정. 특정 커뮤니티의 통계로 제시하지 않는다. 모든 시간은 KST.
export const activityWindows = [
  { name: '오전', hour: 8, duration: 180, weight: 20 },
  { name: '점심', hour: 12, duration: 120, weight: 25 },
  { name: '퇴근', hour: 18, duration: 240, weight: 40 },
  { name: '심야', hour: 23, duration: 120, weight: 15 },
]
export const demoPlans = carriers.flatMap((carrier, i) => [
  { id: `demo-${i}-0`, carrier, name: `${carrier} 데모 라이트`, price: 45000 + i * 1000, data: '15GB', voice: '무제한', sms: '기본 제공', segment: '일반', networks: ['5G'] },
  { id: `demo-${i}-1`, carrier, name: `${carrier} 데모 스탠다드`, price: 65000 + i * 1000, data: '100GB', voice: '무제한', sms: '기본 제공', segment: '일반', networks: ['5G'] },
  { id: `demo-${i}-2`, carrier, name: `${carrier} 데모 프리미엄`, price: 89000 + i * 1000, data: '무제한', voice: '무제한', sms: '기본 제공', segment: '일반', networks: ['5G'] },
])
export const demoQuotes = regions.flatMap((region, r) => devices.flatMap((device, d) => carriers.flatMap((carrier, c) => ['번호이동', '기기변경'].map((joinType, j) => {
  const devicePaid = 120000 + d * 95000 + r * 13000 + c * 27000 + j * 150000
  const planPrice = 89000 + c * 1000
  return { id: `${r}-${d}-${c}-${j}`, region, device, carrier, joinType, devicePaid, planPrice, holdMonths: 6, afterPrice: 55000, addonMonthly: 9900, addonMonths: 3, discountType: '공시지원금', total24: devicePaid + planPrice * 6 + 55000 * 18 + 9900 * 3 }
}))))
