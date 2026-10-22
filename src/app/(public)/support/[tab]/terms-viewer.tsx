'use client'

import { useState } from 'react'
import { FileText, Lock } from 'lucide-react'

export default function TermsViewer() {
  const [subTab, setSubTab] = useState<'rules' | 'privacy'>('rules')
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || '성지평가제'
  const domainName = 'www.phonecomu.com'
  const emailAddr = 'contact@phonecomu.com'

  return (
    <div className="space-y-6">
      {/* 서브 토글 버튼 (이용약관 / 개인정보 처리방침 한군데 모음) */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setSubTab('rules')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
            subTab === 'rules'
              ? 'bg-purple-900/50 text-purple-200 border border-purple-800'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
          }`}
        >
          <FileText className="h-4 w-4" />
          <span>서비스 이용약관</span>
        </button>
        <button
          onClick={() => setSubTab('privacy')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
            subTab === 'privacy'
              ? 'bg-purple-900/50 text-purple-200 border border-purple-800'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
          }`}
        >
          <Lock className="h-4 w-4" />
          <span>개인정보 처리방침</span>
        </button>
      </div>

      {/* 약관 상세 본문 문서 박스 */}
      <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6 text-xs text-slate-300 space-y-5 leading-relaxed overflow-y-auto max-h-[500px] scrollbar-thin scrollbar-thumb-slate-800 font-semibold">
        {subTab === 'rules' ? (
          <>
            <h4 className="text-sm font-black text-white border-b border-slate-850 pb-2">◈ 이용약관 ◈</h4>
            
            <section className="space-y-2">
              <h5 className="font-bold text-slate-100">제1조(목적)</h5>
              <p>
                ① {siteName}({domainName}) 서비스 약관(이하 "본 약관"이라 합니다)은 이용자가 {siteName}에서 제공하는 인터넷 관련 서비스(이하 "서비스"라 합니다)를 이용함에 있어 이용자와 "{siteName}"의 권리·의무 및 책임사항을 규정함을 목적으로 합니다.
              </p>
              <p>
                ② 이용자가 되고자 하는 자가 "{siteName}"에서 정한 소정의 절차를 거쳐서 "약관동의" 단추를 누르면 본 약관에 동의하는 것으로 간주합니다. 본 약관에 정하는 이외의 이용자와 "{siteName}"의 권리, 의무 및 책임사항에 관해서는 전기통신사업법 기타 대한민국의 관련 법령과 상관습에 의합니다.
              </p>
            </section>

            <section className="space-y-2">
              <h5 className="font-bold text-slate-100">제2조(이용자의 정의)</h5>
              <p>
                ① "이용자"란 "{siteName}"에 접속하여 본 약관에 따라 "{siteName}" 회원으로 가입하여 "{siteName}"에서 제공하는 서비스를 받는 자를 말합니다.
              </p>
            </section>

            <section className="space-y-2">
              <h5 className="font-bold text-slate-100">제3조(회원 가입)</h5>
              <p>
                ① 이용자가 되고자 하는 자는 "{siteName}"에서 정한 가입 양식에 따라 회원정보를 기입하고 "등록하기" 단추를 누르는 방법으로 회원 가입을 신청합니다.
              </p>
              <p>② "{siteName}"은 제1항과 같이 회원으로 가입할 것을 신청한 자가 다음 각 호에 해당하지 않는 한 신청한 자를 회원으로 등록합니다.</p>
              <ol className="list-decimal pl-5 space-y-1 text-slate-400">
                <li>등록 내용에 허위, 기재누락, 오기가 있는 경우</li>
                <li>기타 회원으로 등록하는 것이 "{siteName}"의 기술상 현저히 지장이 있다고 판단되는 경우</li>
              </ol>
              <p>③ 회원가입계약의 성립시기는 "{siteName}"의 등록완료한 시점으로 합니다.</p>
              <p>④ 회원은 제1항의 회원정보 기재 내용에 변경이 발생한 경우, 즉시 변경사항을 정정하여 기재하여야 합니다.</p>
            </section>

            <section className="space-y-2">
              <h5 className="font-bold text-slate-100">제4조(서비스의 제공 및 변경)</h5>
              <p>① "{siteName}"은 이용자에게 아래와 같은 서비스를 제공합니다.</p>
              <ol className="list-decimal pl-5 space-y-1 text-slate-400">
                <li>사이트내의 컨텐츠 이용 서비스</li>
                <li>기타 "{siteName}"에서 자체 개발하거나 다른 회사와의 협력계약 등을 통해 회원들에게 제공할 일체의 서비스</li>
              </ol>
              <p>② "{siteName}"은 그 변경될 서비스의 내용 및 제공일자를 공지사항 게시판 등을 통해 이용자에게 통지하고, 제1항에 정한 서비스를 변경하여 제공할 수 있습니다.</p>
              <p>③ "{siteName}"은 쇼핑 정보 커뮤니티입니다. 상품 주문, 배송 및 환불의 의무와 책임은 각 판매 업체에 있습니다.</p>
            </section>

            <section className="space-y-2">
              <h5 className="font-bold text-slate-100">제5조(서비스의 중단)</h5>
              <p>
                ① "{siteName}"은 컴퓨터 등 정보통신설비의 보수점검·교체 및 고장, 통신의 두절 등의 사유가 발생한 경우에는 서비스의 제공을 일시적으로 중단할 수 있고, 새로운 서비스로의 교체 기타 "{siteName}"에서 적절하다고 판단하는 사유에 기하여 현재 제공되는 서비스를 완전히 중단할 수 있습니다.
              </p>
              <p>
                ② 제1항에 의한 서비스 중단의 경우에는 "{siteName}"은 회원정보에 기재된 수단 또는 공지를 통해 이용자에게 통지합니다. 다만, "{siteName}"에서 통제할 수 없는 사유로 인한 서비스의 중단(시스템 관리자의 고의, 과실이 없는 디스크 장애, 시스템 다운 등)으로 인하여 사전 통지가 불가능한 경우에는 그러하지 아니합니다.
              </p>
            </section>

            <section className="space-y-2">
              <h5 className="font-bold text-slate-100">제6조(이용자 탈퇴 및 자격 상실 등)</h5>
              <p>
                ① 회원 탈퇴를 요청하거나 개인정보의 수집 및 이용에 대한 동의를 철회하는 경우, 30일의 유예기간 이후 해당 개인정보를 파기합니다.
              </p>
              <p>다음의 사유에 해당하는 경우에는 해당 사유 종료 시 개인정보를 지체 없이 파기합니다.</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li>관계 법령 위반에 따른 수사, 조사 등이 진행 중인 경우에는 해당 수사/조사가 진행 완료 시</li>
                <li>홈페이지 이용에 따른 채권, 채무관계 잔존 및 장터 이용에 따른 문제 발생시 해당 정산 및 처리 완료 시</li>
              </ul>
              <p>또한 {siteName} 내부 방침에 의한 다음의 정보를 보존합니다.</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li>이용에 제재를 받은 회원은 제재 기간 동안 탈퇴가 불가능하며, 제재 기간 중 탈퇴 원할 시 범죄 예방을 위하여 문의게시판에 주민번호 뒷자리를 가린 신분증을 제시해야 합니다.</li>
                <li>부정이용 및 악의적이용으로 타 회원에 피해를 준 이용자는 재가입을 최대 5년간 제한하며, 이를 위해 중복가입확인정보(DI)를 최대 5년간 보존합니다.</li>
              </ul>
              <p>
                ② 이용자가 다음 각 호의 사유에 해당하는 경우, "{siteName}"은 이용자의 회원자격을 적절한 방법으로 제한 및 정지, 상실시킬 수 있습니다.
              </p>
              <ol className="list-decimal pl-5 space-y-1 text-slate-400">
                <li>가입 신청 시에 허위 내용을 등록한 경우</li>
                <li>다른 사람의 "서비스" 이용을 방해하거나 그 정보를 도용하는 등 전자거래질서를 위협하는 경우</li>
                <li>"서비스"를 이용하여 법령과 본 약관이 금지하거나 공서양속에 반하는 행위를 하는 경우</li>
              </ol>
            </section>

            <section className="space-y-2">
              <h5 className="font-bold text-slate-100">제7조(이용자에 대한 통지)</h5>
              <p>
                ① "{siteName}"은 특정 이용자에 대한 통지를 하는 경우 "{siteName}"의 회원정보에 기재된 E-mail, 쪽지, 댓글 등을 통해 통지를 합니다.
              </p>
              <p>
                ② "{siteName}"은 불특정다수 이용자에 대한 통지를 하는 경우 "{siteName}" 게시판에 게시함으로써 개별 통지에 갈음할 수 있습니다.
              </p>
            </section>

            <section className="space-y-2">
              <h5 className="font-bold text-slate-100">제8조(이용자의 개인정보보호)</h5>
              <p>
                "{siteName}"은 관련법령이 정하는 바에 따라서 이용자 등록정보를 포함한 이용자의 개인정보를 보호하기 위하여 노력합니다. 이용자의 개인정보보호에 관해서는 관련법령 및 "{siteName}"에서 정하는 "개인정보처리방침"에 정한 바에 의합니다.
              </p>
            </section>

            <section className="space-y-2">
              <h5 className="font-bold text-slate-100">제9조("{siteName}"의 의무)</h5>
              <p>
                ① "{siteName}"은 법령과 본 약관이 금지하거나 공서양속에 반하는 행위를 하지 않으며 본 약관이 정하는 바에 따라 지속적이고, 안정적으로 서비스를 제공하기 위해서 노력합니다.
              </p>
              <p>② "{siteName}"은 이용자가 원하지 않는 영리목적의 광고성 전자우편을 발송하지 않습니다.</p>
            </section>

            <section className="space-y-2">
              <h5 className="font-bold text-slate-100">제10조(이용자의 ID 및 비밀번호에 대한 의무)</h5>
              <p>
                ① "{siteName}"은 관계법령, "개인정보처리방침"에 의해서 그 책임을 지는 경우를 제외하고, 자신의 ID와 비밀번호에 관한 관리책임은 각 이용자에게 있습니다.
              </p>
              <p>② 이용자는 자신의 ID 및 비밀번호를 제3자에게 이용하게 해서는 안됩니다.</p>
              <p>
                ③ 이용자는 자신의 ID 및 비밀번호를 도난당하거나 제3자가 사용하고 있음을 인지한 경우에는 바로 "{siteName}"에 통보하고 "{siteName}"의 안내가 있는 경우에는 그에 따라야 합니다.
              </p>
            </section>

            <section className="space-y-2">
              <h5 className="font-bold text-slate-100">제11조(이용자의 의무)</h5>
              <p>① 이용자는 다음 각 호의 행위를 하여서는 안됩니다.</p>
              <ol className="list-decimal pl-5 space-y-1 text-slate-400">
                <li>회원가입신청 또는 변경시 허위내용을 등록하는 행위</li>
                <li>"{siteName}"에 게시된 정보를 변경하는 행위</li>
                <li>"{siteName}" 기타 제3자의 인격권 또는 지적재산권을 침해하거나 업무를 방해하는 행위</li>
                <li>다른 회원의 ID를 도용하는 행위</li>
                <li>정크메일(junk mail), 스팸메일(spam mail), 행운의 편지(chain letters), 피라미드 조직에 가입할 것을 권유하는 메일, 외설 또는 폭력적인 메시지 ·화상·음성 등이 담긴 메일을 보내거나 기타 공서양속에 반하는 정보를 공개 또는 게시하는 행위.</li>
                <li>관련 법령에 의하여 그 전송 또는 게시가 금지되는 정보(컴퓨터 프로그램 등)의 전송 또는 게시하는 행위</li>
                <li>사이트의 직원이나 서비스의 관리자를 가장하거나 사칭하여 또는 타인의 명의를 모용하여 글을 게시하거나 메일을 발송하는 행위</li>
                <li>컴퓨터 소프트웨어, 하드웨어, 전기통신 장비의 정상적인 가동을 방해, 파괴할 목적으로 고안된 소프트웨어 바이러스, 기타 다른 컴퓨터 코드, 파일, 프로그램을 포함하고 있는 자료를 게시하거나 전자우편으로 발송하는 행위</li>
                <li>스토킹(stalking) 등 다른 이용자를 괴롭히는 행위</li>
                <li>다른 이용자에 대한 개인정보를 그 동의 없이 수집, 저장, 공개하는 행위</li>
                <li>불특정 다수의 자를 대상으로 하여 광고 또는 선전을 게시하거나 스팸메일을 전송하는 등의 방법으로 "{siteName}"의 서비스를 이용하여 영리목적의 활동을 하는 행위</li>
                <li>"{siteName}"에서 제공하는 서비스에 정한 약관 기타 서비스 이용에 관한 규정을 위반하는 행위</li>
              </ol>
              <p>
                ② 제1항에 해당하는 행위를 한 이용자가 있을 경우 "{siteName}"은 본 약관 제6조 제2항에서 정한 바에 따라 이용자의 회원자격을 적절한 방법으로 제한 및 정지, 상실시킬 수 있습니다.
              </p>
              <p>③ 이용자는 그 귀책사유로 인하여 "{siteName}"에서나 다른 이용자가 입은 손해를 배상할 책임이 있습니다.</p>
            </section>

            <section className="space-y-2">
              <h5 className="font-bold text-slate-100">제12조(공개게시물의 삭제)</h5>
              <p>
                이용자의 공개게시물의 내용이 다음 각 호에 해당하는 경우 "{siteName}"은 이용자에게 사전 통지 없이 해당 공개게시물을 삭제할 수 있고, 해당 이용자의 회원 자격을 제한, 정지 또는 상실시킬 수 있습니다.
              </p>
              <ol className="list-decimal pl-5 space-y-1 text-slate-400">
                <li>다른 이용자 또는 제3자를 비방하거나 중상 모략으로 명예를 손상시키는 내용</li>
                <li>공서양속에 위반되는 내용의 정보, 문장, 도형 등을 유포하는 내용</li>
                <li>범죄행위와 관련이 있다고 판단되는 내용</li>
                <li>다른 이용자 또는 제3자의 저작권 등 기타 권리를 침해하는 내용</li>
                <li>기타 관계 법령에 위배된다고 판단되는 내용</li>
              </ol>
            </section>

            <section className="space-y-2">
              <h5 className="font-bold text-slate-100">제13조(저작권의 귀속 및 이용제한)</h5>
              <p>① "{siteName}"에서 작성한 저작물에 대한 저작권 기타 지적재산권은 "{siteName}"에 귀속합니다.</p>
              <p>
                ② 이용자는 "{siteName}"을 이용함으로써 얻은 정보를 "{siteName}"의 사전승낙 없이 복제, 전송, 출판, 배포, 방송 기타 방법에 의하여 영리목적으로 이용하거나 제3자에게 이용하게 하여서는 안됩니다.
              </p>
              <p>
                ③ 회원이 서비스 내에 게시한 게시물의 저작권은 "{siteName}"에 귀속됩니다. 회사는 서비스의 운영, 전시, 전송, 배포, 홍보의 목적으로 회원의 별도의 허락 없이 무상으로 저작권법에 규정하는 공정한 관행에 합치되게 합리적인 범위 내에서 다음과 같이 회원이 등록한 게시물을 사용할 수 있습니다.
              </p>
              <ol className="list-decimal pl-5 space-y-1 text-slate-400">
                <li>서비스 내에서 회원 게시물의 복제, 수정, 개조, 전시, 전송, 배포 및 저작물성을 해치지 않는 범위 내에서의 편집 저작물 작성</li>
                <li>미디어, 통신사 등 서비스 제휴 파트너에게 회원의 게시물 내용을 제공, 전시 혹은 홍보하게 하는 것. 단, 이 경우 "{siteName}"은 별도의 동의 없이 회원의 이용자ID/닉네임 및 관련 IP 외에 회원의 개인정보를 제공하지 않습니다.</li>
              </ol>
              <p>
                ④ 회사는 전항 이외의 방법으로 회원의 게시물을 이용하고자 하는 경우, 쪽지, 댓글, 전자우편 등의 방법을 통해 사전에 회원의 동의를 얻어야 합니다.
              </p>
            </section>

            <section className="space-y-2">
              <h5 className="font-bold text-slate-100">제14조(광고게재 및 광고주와의 거래)</h5>
              <p>
                ① "{siteName}"은 회원에게 서비스를 제공할 수 있는 서비스 투자기반의 일부는 광고게재를 통한 수익으로부터 나옵니다. 회원은 회원이 등록한 게시물의 내용을 활용한 광고게재 및 기타 서비스상에 노출되는 광고게재에 대해 동의합니다.
              </p>
              <p>
                ② "{siteName}"은 서비스상에 게재되어 있거나 서비스를 통한 광고주의 판촉활동에 회원이 참여하거나 교신 또는 거래를 함으로써 발생하는 손실과 손해에 대해 책임을 지지 않습니다.
              </p>
            </section>

            <section className="space-y-2">
              <h5 className="font-bold text-slate-100">제15조(약관의 개정)</h5>
              <p>
                ① "{siteName}"은 약관의규제등에관한법률, 전자거래기본법, 전자서명법, 정보통신망이용촉진등에관한법률 등 관련법을 위배하지 않는 범위에서 본 약관을 개정할 수 있습니다.
              </p>
              <p>
                ② "{siteName}"에서 본 약관을 개정할 경우에는 적용일자 및 개정사유를 명시하여 현행약관과 함께 초기화면에 그 적용일자 7일 이전부터 적용일자 전일까지 공지합니다.
              </p>
              <p>
                ③ "이용자"는 변경된 약관에 대해 거부할 권리가 있습니다. "이용자"는 변경된 약관이 공지된 후 15일 이내에 거부의사를 표명할 수 있습니다. "이용자"가 거부하는 경우 "{siteName}"은 당해 "이용자"와의 계약을 해지할 수 있습니다. 만약 "이용자"가 변경된 약관이 공지된 후 15일 이내에 거부의사를 표시하지 않는 경우에는 동의하는 것으로 간주합니다.
              </p>
            </section>

            <section className="space-y-2">
              <h5 className="font-bold text-slate-100">제16조(재판관할)</h5>
              <p>
                "{siteName}"과 이용자간에 발생한 서비스 이용에 관한 분쟁에 대하여는 대한민국 법을 적용하며, 본 분쟁으로 인한 소는 민사소송법상의 관할을 가지는 대한민국의 법원에 제기합니다.
              </p>
            </section>
          </>
        ) : (
          <>
            <h4 className="text-sm font-black text-white border-b border-slate-855 pb-2">◈ 개인정보 처리방침 ◈</h4>
            
            <p className="text-slate-400 font-medium">
              {siteName}은 정보주체의 자유와 권리 보호를 위해 「개인정보 보호법」 및 관계 법령이 정한 바를 준수하여 개인정보를 적법하게 처리하고 안전하게 관리하고 있습니다. 이에 「개인정보 보호법」 제30조에 따라 정보주체에게 개인정보의 처리와 보호에 관한 절차 및 기준을 안내하고, 이와 관련한 고충을 신속하고 원활하게 처리할 수 있도록 다음과 같이 개인정보 처리방침을 수립·공개합니다.
            </p>

            <section className="space-y-2">
              <h5 className="font-bold text-slate-100">1. 개인정보의 처리 목적</h5>
              <p>{siteName}은 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 「개인정보 보호법」에 따라 필요한 조치를 이행하겠습니다.</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li>
                  <b className="text-slate-200">회원가입 및 회원관리:</b> 회원 가입 의사 확인, 본인 식별·인증, 회원자격 유지·관리, 계정 찾기, 중복가입 확인, 부정이용 방지, 연령 확인, 고지·통지, 민원처리, 분쟁 대응 등을 목적으로 처리합니다.
                </li>
                <li>
                  <b className="text-slate-200">서비스 제공 및 운영:</b> 커뮤니티 서비스 제공, 게시글·댓글·쪽지 기능 제공, 회원 간 소통 기능 운영, 문의 대응, 서비스 운영기록 관리, 서비스 품질 개선 등을 목적으로 처리합니다.
                </li>
                <li>
                  <b className="text-slate-200">마케팅 및 서비스 안내:</b> 이벤트, 서비스 안내, 광고성 정보 전송 동의 여부 관리 등을 목적으로 처리합니다. (별도 동의를 받은 범위에 한함)
                </li>
                <li>
                  <b className="text-slate-200">본인확인 서비스 제공:</b> 회원가입, 계정 찾기, 중복가입 확인, 부정이용 방지 등을 위해 본인확인기관을 통한 인증 업무를 수행합니다.
                </li>
              </ul>
            </section>

            <section className="space-y-2">
              <h5 className="font-bold text-slate-100">2. 처리하는 개인정보의 항목</h5>
              <p>{siteName}은 서비스 제공을 위해 필요한 최소한의 범위에서 개인정보를 처리합니다.</p>
              <div className="space-y-2 text-slate-450 bg-slate-900 border border-slate-800 p-4 rounded-xl text-slate-400">
                <p><b>가. 정보주체의 동의를 받지 않고 처리하는 개인정보 항목 (계약의 이행)</b></p>
                <p>- 필수항목: 생년월일, 성별, 이름, ID, 비밀번호, 비밀번호 질문과 답변, 이메일, 연락처, 휴대폰번호, 중복가입확인정보(DI)</p>
                <p>- 자동 생성·수집 항목: 서비스 이용기록, 접속 로그, 쿠키, 접속 IP 정보, 쪽지내역</p>
                
                <p className="mt-3"><b>나. 정보주체의 동의를 받아 처리하는 개인정보 항목</b></p>
                <p>- 마케팅 수신관리: 이메일, 휴대폰번호, 서비스 이용 관련 동의 여부 정보</p>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">※ {siteName}은 원칙적으로 주민등록번호 및 임의의 민감정보를 수집·이용하지 않습니다.</p>
            </section>

            <section className="space-y-2">
              <h5 className="font-bold text-slate-100">3. 14세 미만 아동의 개인정보 처리에 관한 사항</h5>
              <p>
                {siteName}은 14세 미만 아동의 개인정보를 처리하는 경우에는 법정대리인의 동의를 받아 처리하며, 이를 확인하기 위해 필요한 최소한의 정보만을 수집할 수 있습니다.
              </p>
            </section>

            <section className="space-y-2">
              <h5 className="font-bold text-slate-100">4. 개인정보의 처리 및 보유 기간</h5>
              <p>
                회원정보는 <b className="text-slate-200">회원 탈퇴 시까지 보유</b>합니다. 다만, 관계 법령 위반에 따른 수사·조사 진행 시에는 해당 절차 종료 시까지, 부정이용 대상자 재가입 제한 DI 정보는 최대 5년간 보관합니다.
              </p>
            </section>

            <section className="space-y-2">
              <h5 className="font-bold text-slate-100">5. 개인정보의 파기 절차 및 방법</h5>
              <p>목적 달성 시 전자적 파일은 복구 불가능한 방법으로 즉시 영구 삭제하며, 종이 인쇄물은 분쇄 또는 소각 처리합니다.</p>
            </section>

            <section className="space-y-2">
              <h5 className="font-bold text-slate-100">6. 개인정보의 제3자 제공에 관한 사항</h5>
              <p>원칙적으로 제3자에게 개인정보를 제공하지 않으나 법률 특별 규정, 정보주체 별도 동의, 수사기관의 적법 절차 청구 시에는 예외로 합니다.</p>
            </section>

            <section className="space-y-2">
              <h5 className="font-bold text-slate-100">7. 개인정보 처리업무의 위탁에 관한 사항</h5>
              <p>
                {siteName}은 원활한 업무 처리를 위하여 NICE평가정보에 회원가입 및 계정 찾기 시의 본인확인, 중복가입 확인, 인증 결과 제공 업무를 위탁하고 있습니다.
              </p>
            </section>

            <section className="space-y-2">
              <h5 className="font-bold text-slate-100">8. 행태정보의 수집·이용 및 거부 등에 관한 사항 (맞춤형 광고)</h5>
              <p>{siteName}에는 광고 사업자의 광고가 게재될 수 있으며, 광고 사업자는 이용자의 관심사에 맞는 광고를 보여주기 위해 아래와 같이 행태정보를 수집·이용할 수 있습니다.</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li>수집 항목: 웹사이트 방문 기록, 광고 클릭·노출 기록, 쿠키, 광고 식별자</li>
                <li>수집 방법: 이용자가 서비스를 방문할 때 광고 사업자의 스크립트·쿠키를 통해 자동 수집</li>
                <li>수집 목적: 이용자 관심사 기반 맞춤형 광고 제공, 광고 성과 측정</li>
                <li>행태정보를 수집·처리하는 광고 사업자: Google(애드센스), 카카오(애드핏), 쿠팡(쿠팡 파트너스) 중 서비스가 실제로 이용하는 사업자</li>
                <li>보유·이용 기간: 각 광고 사업자의 개인정보 처리방침에 따름</li>
                <li>거부 방법: 브라우저 설정에서 쿠키 저장을 거부하거나 삭제할 수 있으며, Google 광고 설정(adssettings.google.com)에서 맞춤 광고를 끌 수 있습니다. 거부하더라도 광고는 표시되며 관심사와 무관한 광고가 보일 수 있습니다.</li>
              </ul>
            </section>

            <section className="space-y-2">
              <h5 className="font-bold text-slate-100">9. 개인정보 보호책임자 및 관련 고충 처리</h5>
              <p>개인정보 처리에 관한 업무 및 피해구제를 담당하는 부서는 다음과 같습니다.</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-400">
                <li>담당부서: 회원관리팀</li>
                <li>담당자 이메일: <b className="text-purple-400 font-extrabold">{emailAddr}</b></li>
              </ul>
            </section>

            <section className="space-y-2 text-[10px] text-slate-500 font-semibold border-t border-slate-900 pt-3">
              <p>시행 일자: 본 개인정보 처리방침은 2026년 4월 8일부터 적용됩니다.</p>
            </section>
          </>
        )}
      </div>
    </div>
  )
}
