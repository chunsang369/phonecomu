'use client'

// 폰커뮤니티 서비스 이용약관 / 개인정보 처리방침 본문.
// 회원가입 동의 단계와 고객센터 약관 페이지에서 공용으로 사용한다.
// 컨테이너(라이트/다크)에 맞춰 자동으로 색이 잡히도록 theme-adaptive 클래스 사용.

const SITE = '폰커뮤니티'
const NOTICE_HREF = '/board/notice'

const headCls = 'font-bold text-slate-800 dark:text-slate-100'
const bodyCls = 'text-slate-600 dark:text-slate-300'
const listCls = 'list-decimal pl-5 space-y-1 text-slate-500 dark:text-slate-400'
const ulCls = 'list-disc pl-5 space-y-1 text-slate-500 dark:text-slate-400'

export function TermsBody() {
  return (
    <div className={`space-y-5 leading-relaxed ${bodyCls}`}>
      <section className="space-y-2">
        <h5 className={headCls}>제1조 (목적)</h5>
        <p>
          본 약관은 {SITE}(이하 &quot;회사&quot;라 합니다)가 제공하는 {SITE} 및 {SITE} 관련 제반 서비스(이하
          &quot;서비스&quot;라 합니다)의 이용과 관련하여 회사와 회원과의 권리, 의무 및 책임사항, 기타 필요한 사항을
          규정함을 목적으로 합니다.
        </p>
      </section>

      <section className="space-y-2">
        <h5 className={headCls}>제2조 (회원의 정의)</h5>
        <p>
          ① 회원이란 회사가 제공하는 서비스에 접속하여 본 약관에 따라 회사의 이용절차에 동의하고 회사가 제공하는 서비스를
          이용하는 이용자를 말합니다.
        </p>
      </section>

      <section className="space-y-2">
        <h5 className={headCls}>제3조 (회원 가입)</h5>
        <p>
          ① 회원이 되고자 하는 자는 회사가 정한 가입 양식에 따라 회원정보를 기입하고 &quot;동의&quot;, &quot;확인&quot; 등의
          버튼을 누르는 방법으로 회원 가입을 신청합니다.
        </p>
        <p>② 회사는 회원으로 가입할 것을 신청한 자가 다음 각 호에 해당하지 않는 한 신청한 자를 회원으로 등록합니다.</p>
        <ol className={listCls}>
          <li>등록 내용에 허위, 기재누락, 오기가 있는 경우</li>
          <li>제6조 제3항에 해당하는 회원 자격 제한 및 정지, 상실을 한 경험이 있었던 경우</li>
          <li>기타 회원으로 등록하는 것이 회사의 서비스 운영 및 기술상 현저히 지장이 있다고 판단되는 경우</li>
        </ol>
        <p>③ 회원가입계약의 성립시기는 회사의 승낙이 가입신청자에게 도달한 시점으로 합니다.</p>
        <p>④ 회원은 회원정보 기재 내용에 변경이 발생한 경우, 즉시 변경사항을 정정하여 기재하여야 합니다.</p>
      </section>

      <section className="space-y-2">
        <h5 className={headCls}>제4조 (서비스의 제공 및 변경)</h5>
        <p>① 회사는 회원에게 아래와 같은 서비스를 제공합니다.</p>
        <ol className={listCls}>
          <li>커뮤니티 서비스 (게시판, 댓글, 쪽지, 시세 공유 등)</li>
          <li>검색 및 인기글/추천 서비스</li>
          <li>기타 회사가 자체 개발하거나 다른 회사와의 협력계약 등을 통해 회원들에게 제공할 일체의 서비스</li>
        </ol>
        <p>
          ② 회사는 서비스의 내용 및 제공일자를 공지사항 게시판 등을 통해 회원에게 통지하고, 제1항에 정한 서비스를 변경하여
          제공할 수 있습니다.
        </p>
      </section>

      <section className="space-y-2">
        <h5 className={headCls}>제5조 (서비스의 중단)</h5>
        <p>
          ① 회사는 컴퓨터 등 정보통신설비의 보수점검·교체 및 고장, 통신의 두절 등의 사유가 발생한 경우에는 서비스의 제공을
          일시적으로 중단할 수 있습니다.
        </p>
        <p>
          ② 회사가 통제할 수 없는 사유로 서비스가 중단(시스템 관리자의 고의·과실이 없는 디스크 장애, 시스템 다운 등)되어
          사전 통지가 불가능한 경우에는 그러하지 아니합니다.
        </p>
      </section>

      <section className="space-y-2">
        <h5 className={headCls}>제6조 (회원 탈퇴 및 자격 상실 등)</h5>
        <p>
          ① 회원은 회사에 언제든지 회원 탈퇴를 요청할 수 있으며, 회사는 요청 즉시 회원 등록 말소 절차를 진행합니다. 단,
          공용 게시판 등에 등록된 게시물은 자동 삭제되지 않습니다.
        </p>
        <p>② 회원이 다음 각 호에 해당하는 경우, 회사는 회원자격을 제한·정지·상실시킬 수 있습니다.</p>
        <ol className={listCls}>
          <li>가입 신청 시 허위 내용을 등록한 경우</li>
          <li>다른 사람의 서비스 이용을 방해하거나 그 정보를 도용하는 등 전자거래질서를 위협하는 경우</li>
          <li>법령과 본 약관이 금지하거나 공서양속에 반하는 행위를 하는 경우</li>
        </ol>
        <p>③ 연속하여 1년 동안 로그인 기록이 없는 경우, 회사는 회원자격을 상실시킬 수 있습니다.</p>
      </section>

      <section className="space-y-2">
        <h5 className={headCls}>제7조 (회원에 대한 통지)</h5>
        <p>① 회사가 특정 회원에게 통지하는 경우 회원정보에 등록된 메일주소, 쪽지 등을 사용할 수 있습니다.</p>
        <p>② 불특정다수 회원에 대한 통지는 7일 이상 공지사항 게시판에 게시함으로써 개별 통지에 갈음할 수 있습니다.</p>
      </section>

      <section className="space-y-2">
        <h5 className={headCls}>제8조 (회원의 개인정보)</h5>
        <p>
          회사는 서비스를 제공하기 위하여 관련 법령에 따라 회원으로부터 필요한 개인정보를 수집하며, 개별 항목은
          개인정보 처리방침에서 고지합니다.
        </p>
      </section>

      <section className="space-y-2">
        <h5 className={headCls}>제9조 (회사의 의무)</h5>
        <p>① 회사는 법령과 본 약관이 금지하거나 공서양속에 반하는 행위를 하지 않으며, 안정적으로 서비스를 제공하기 위해 노력합니다.</p>
        <p>② 회사는 회원이 안전하고 편리하게 서비스를 이용할 수 있도록 시스템을 구축합니다.</p>
      </section>

      <section className="space-y-2">
        <h5 className={headCls}>제10조 (회원의 ID 및 비밀번호에 대한 의무)</h5>
        <p>① 자신의 ID와 비밀번호에 관한 관리책임은 각 회원에게 있습니다.</p>
        <p>② 회원은 자신의 ID 및 비밀번호를 제3자에게 이용하게 해서는 안 됩니다.</p>
        <p>③ ID·비밀번호를 도난당하거나 제3자가 사용하고 있음을 인지한 경우 즉시 회사에 통보하고 안내에 따라야 합니다.</p>
      </section>

      <section className="space-y-2">
        <h5 className={headCls}>제11조 (회원의 의무)</h5>
        <p>① 회원은 다음 각 호의 행위를 하여서는 안 됩니다.</p>
        <ol className={listCls}>
          <li>회원가입 신청 또는 변경 시 허위내용을 등록하는 행위</li>
          <li>회사 및 제3자의 지적재산권을 침해하거나 업무를 방해하는 행위</li>
          <li>다른 회원의 ID를 도용하는 행위</li>
          <li>관련 법령에 의하여 전송·게시가 금지되는 정보를 게시·전송하는 행위</li>
          <li>회사의 직원 또는 관리자를 사칭하거나 타인의 명의를 도용하여 정보를 게시·전송하는 행위</li>
          <li>바이러스 등 정상적인 서비스 운영을 방해·파괴할 목적의 자료를 게시·전송하는 행위</li>
          <li>스토킹 등 다른 회원을 괴롭히는 행위</li>
          <li>다른 회원의 개인정보를 동의 없이 수집·저장·공개하는 행위</li>
          <li>불특정 다수를 대상으로 광고·선전을 게시하거나 음란물을 게시하는 행위</li>
          <li className="font-semibold text-slate-700 dark:text-slate-200">ID를 2개 이상 사용하는 행위 (중복 계정)</li>
          <li className="font-semibold text-slate-700 dark:text-slate-200">추천(좋아요·다른의견) 및 조회수를 조작하는 행위</li>
          <li>게시판 글이나 댓글 도배</li>
          <li>채팅방 도배</li>
          <li>기타 상식적인 &quot;악성&quot; 영업방해 행위</li>
          <li>회사가 제공하는 서비스의 공지사항 규정을 위반하는 행위</li>
          <li>서버나 회선에 무리를 줄 수 있는 행위</li>
          <li>자동화된 프로그램이나 봇을 통해 로그인·기능을 이용하거나 사이트 내용을 무단 추출하는 행위</li>
        </ol>
        <p>② 위 행위를 한 회원에 대해 회사는 제6조에 따라 회원자격을 제한·정지·상실시킬 수 있습니다.</p>
        <p>③ 회원은 그 귀책사유로 회사나 다른 회원이 입은 손해를 배상할 책임이 있습니다.</p>
      </section>

      <section className="space-y-2">
        <h5 className={headCls}>제12조 (공개게시물의 삭제 또는 이용제한)</h5>
        <p>
          ① 회원의 공개게시물이 다음 각 호에 해당하는 경우 회사는 사전 통지 없이 삭제·변경할 수 있고, 회원 자격을 제한·정지·상실시킬 수 있습니다.
        </p>
        <ol className={listCls}>
          <li>다른 회원 또는 제3자를 비방하거나 명예를 손상시키는 내용</li>
          <li>음란물, 욕설 등 공서양속에 위반되는 내용</li>
          <li>범죄행위와 관련이 있다고 판단되는 내용</li>
          <li>다른 회원 또는 제3자의 저작권 등 권리를 침해하는 내용</li>
          <li>종교적·정치적 분쟁을 야기하여 회사의 업무를 방해하는 내용</li>
          <li>타인의 개인정보·사생활을 침해하거나 명예를 손상시키는 내용</li>
          <li>동일한 내용을 중복하여 다수 게시하는 등 게시 목적에 어긋나는 경우</li>
          <li>승인되지 않은 광고·판촉물을 게재하는 경우</li>
          <li>반복적이거나 무의미한 도배성 행위</li>
        </ol>
        <p>② 회사는 서비스 악용 방지를 위해 일부 게시물에 대해 수정·삭제 가능 여부를 제한할 수 있습니다.</p>
      </section>

      <section className="space-y-2">
        <h5 className={headCls}>제13조 (저작권의 귀속 및 게시물의 이용)</h5>
        <p>① 회사가 작성한 저작물에 대한 저작권 기타 지적재산권은 회사에 귀속합니다.</p>
        <p>
          ② 회원이 서비스 내에 게시한 게시물의 저작권은 게시한 회원에게 귀속됩니다. 단, 회사는 서비스의 운영·전시·전송·배포·홍보
          목적으로 합리적인 범위 내에서 회원이 등록한 게시물을 무상으로 사용할 수 있습니다.
        </p>
        <p>③ 회사는 법적인 제한이 있는 글이 아니라면 회원의 게시물을 삭제할 의무가 없습니다.</p>
      </section>

      <section className="space-y-2">
        <h5 className={headCls}>제14조 (광고게재)</h5>
        <p>
          ① 회원은 서비스상에 노출되는 광고게재에 대해 동의합니다. ② 회사는 서비스를 통한 광고주의 판촉활동에 회원이 참여하거나
          거래함으로써 발생하는 손실·손해에 대해 책임을 지지 않습니다.
        </p>
      </section>

      <section className="space-y-2">
        <h5 className={headCls}>제15조 (약관의 개정)</h5>
        <p>① 회사는 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있습니다.</p>
        <p>② 개정 내용이 회원에게 불리할 경우 적용일자 7일 이전부터 공지합니다.</p>
        <p>
          ③ 회원은 변경된 약관 공지 후 14일 이내에 거부의사를 표명할 수 있으며, 기간 내 의사표시가 없으면 동의한 것으로
          간주합니다.
        </p>
      </section>

      <section className="space-y-2">
        <h5 className={headCls}>제16조 (재판관할)</h5>
        <p>
          회사와 회원 간에 발생한 분쟁에 대하여는 대한민국 법을 적용하며, 소는 민사소송법상 관할 법원에 제기합니다.
        </p>
      </section>

      <p className="pt-2 text-[11px] font-medium text-slate-400 dark:text-slate-500">부칙 — 본 약관은 2026년 7월 14일부터 시행합니다.</p>
    </div>
  )
}

export function PrivacyBody() {
  return (
    <div className={`space-y-5 leading-relaxed ${bodyCls}`}>
      <p className="text-slate-500 dark:text-slate-400">
        {SITE}는 「개인정보 보호법」 및 정보통신망 이용촉진 등에 관한 법률 등 관련 법령에 따른 개인정보 보호규정을
        준수하며, 이용자의 개인정보를 적법하게 처리하고 안전하게 관리합니다.
      </p>

      <section className="space-y-2">
        <h5 className={headCls}>1. 개인정보의 수집 항목</h5>
        <p>원활한 서비스 이용과 이용자와의 소통을 위해 아래 항목을 수집합니다.</p>
        <ul className={ulCls}>
          <li><b className="text-slate-700 dark:text-slate-200">[필수]</b> 아이디, 비밀번호, 이메일</li>
          <li><b className="text-slate-700 dark:text-slate-200">[자동수집]</b> IP 주소, 접속 기록, 쿠키, 브라우저 종류 및 헤더값 등</li>
          <li><b className="text-slate-700 dark:text-slate-200">[앱 이용 시]</b> 광고 식별자(GAID/IDFA), 기기정보(모델명, OS버전, 고유식별번호)</li>
          <li><b className="text-slate-700 dark:text-slate-200">[푸시 알림 시]</b> 기기별 고유 식별자</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h5 className={headCls}>2. 개인정보의 수집 방법</h5>
        <p>회원 가입 시 필수항목 기재를 요청하며, 서비스 이용 과정에서 자동수집 항목이 생성·수집됩니다.</p>
      </section>

      <section className="space-y-2">
        <h5 className={headCls}>3. 개인정보의 수집·이용 목적</h5>
        <ul className={ulCls}>
          <li>아이디·비밀번호·이메일: 회원 가입 시 본인 확인, 중복가입 방지, 부정 이용 방지</li>
          <li>IP 주소·접속 기록·쿠키 등: 보안, 불량회원의 부정 이용·비인가 사용 방지, 통계학적 분석</li>
          <li>광고 식별자·기기정보: 광고 효율화</li>
          <li>기기별 고유 식별자: 푸시 알림 제공</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h5 className={headCls}>4. 개인정보의 보유 및 이용기간</h5>
        <ul className={ulCls}>
          <li>가입 회원정보는 탈퇴 시 3년간 보관 후 파기하며, 이 기간 동안 별도 분리 저장·관리합니다.</li>
          <li>게시물 및 댓글의 내용은 사이트 폐쇄 시까지 보관합니다.</li>
          <li>
            악성 사용자의 재가입을 막기 위해 이메일 등에 따른 중복확인정보(DI)로 가입 제한을 할 수 있으며, DI값은 탈퇴 후
            3년이 지나면 삭제합니다. 다만 중대한 위반 사유가 있는 경우 삭제 기간이 연장될 수 있습니다.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h5 className={headCls}>5. 맞춤형 광고 및 행태정보의 처리</h5>
        <p>
          서비스에는 광고 사업자의 광고가 게재될 수 있으며, 광고 사업자는 이용자의 관심사에 맞는 광고를 보여주기 위해 아래와 같이
          행태정보를 수집·이용할 수 있습니다.
        </p>
        <ul className={ulCls}>
          <li>수집 항목: 웹사이트 방문 기록, 광고 클릭·노출 기록, 쿠키, 광고 식별자</li>
          <li>수집 방법: 이용자가 서비스를 방문할 때 광고 사업자의 스크립트·쿠키를 통해 자동 수집</li>
          <li>수집 목적: 이용자 관심사 기반 맞춤형 광고 제공, 광고 성과 측정</li>
          <li>행태정보를 수집·처리하는 광고 사업자: Google(애드센스), 카카오(애드핏), 쿠팡(쿠팡 파트너스) 중 서비스가 실제로 이용하는 사업자</li>
          <li>보유·이용 기간: 각 광고 사업자의 개인정보 처리방침에 따름</li>
          <li>
            거부 방법: 브라우저 설정에서 쿠키 저장을 거부하거나 삭제할 수 있으며, Google 광고 설정(adssettings.google.com)에서
            맞춤 광고를 끌 수 있습니다. 거부하더라도 광고는 표시되며 관심사와 무관한 광고가 보일 수 있습니다.
          </li>
        </ul>
      </section>

      <section className="space-y-2">
        <h5 className={headCls}>6. 개인정보 보호책임자</h5>
        <p>
          개인정보 처리에 관한 업무 및 고충 처리 담당: 회원관리팀 · 이메일{' '}
          <b className="font-extrabold text-[#7C3AED] dark:text-[#A78BFA]">contact@phone-community.com</b>
        </p>
      </section>

      <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
        개인정보 수집 및 이용에 대한 동의를 거부할 권리가 있습니다. 다만, 동의를 거부할 경우 회원가입 및 로그인 서비스가
        제한될 수 있습니다. 본 방침은 2026년 7월 14일부터 시행합니다.
      </p>
    </div>
  )
}

export { NOTICE_HREF }
