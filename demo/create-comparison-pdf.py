"""Render a read-only export of reviewed Contabo records, including every reply."""
import json
import math
import re
from collections import Counter
from datetime import datetime, timezone, timedelta
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parent.parent
data = json.loads((ROOT / '.demo/comparison-30-20261023.json').read_text(encoding='utf-8'))
items = data['items']
assert len(items) == 30
OUT = ROOT / 'output/pdf/community-source-comparison-30.pdf'
OUT.parent.mkdir(parents=True, exist_ok=True)
pdfmetrics.registerFont(TTFont('Korean', 'C:/Windows/Fonts/malgun.ttf'))
pdfmetrics.registerFont(TTFont('KoreanBold', 'C:/Windows/Fonts/malgunbd.ttf'))
ink = colors.HexColor('#16243A')
accent = colors.HexColor('#5633B8')
body = ParagraphStyle('body', fontName='Korean', fontSize=9, leading=14, wordWrap='CJK', textColor=ink)
small = ParagraphStyle('small', parent=body, fontSize=8, leading=12)
title = ParagraphStyle('title', parent=body, fontName='KoreanBold', fontSize=17, leading=24, spaceAfter=12)
heading = ParagraphStyle('heading', parent=body, fontName='KoreanBold', fontSize=11, leading=16, spaceAfter=7)
label = ParagraphStyle('label', parent=small, fontName='KoreanBold', textColor=accent)

def p(s, style=body):
    return Paragraph(escape(str(s)).replace('\n', '<br/>'), style)

def kst(s):
    return datetime.fromisoformat(s.replace('Z', '+00:00')).astimezone(timezone(timedelta(hours=9))).strftime('%Y-%m-%d %H:%M:%S KST')

def count(s):
    return len(s.replace('\r\n', '\n'))

def table(rows, header=True):
    t = Table(rows, colWidths=[253, 253], hAlign='LEFT', repeatRows=1 if header else 0)
    commands = [('VALIGN', (0,0), (-1,-1), 'TOP'), ('LEFTPADDING',(0,0),(-1,-1),10),
                ('RIGHTPADDING',(0,0),(-1,-1),10),('TOPPADDING',(0,0),(-1,-1),8),
                ('BOTTOMPADDING',(0,0),(-1,-1),8),('BOX',(0,0),(-1,-1),.5,colors.HexColor('#D9DFEA')),
                ('INNERGRID',(0,0),(-1,-1),.35,colors.HexColor('#E2E6EE'))]
    if header: commands.append(('BACKGROUND',(0,0),(-1,0),colors.HexColor('#F0EDF8')))
    t.setStyle(TableStyle(commands))
    return t

def footer(c, d):
    c.setStrokeColor(colors.HexColor('#D9DFEA')); c.line(44, 40, 550, 40)
    c.setFont('Korean', 8); c.setFillColor(colors.HexColor('#68758A'))
    c.drawString(44, 27, '성지평가제 | 원문 · 재구성 검수 자료 | 2026-10-23')
    c.drawRightString(550, 27, str(d.page))

story = [Spacer(1,35), p('휴대폰 커뮤니티<br/>원문·재구성 대조 자료'.replace('<br/>','\n'), title),
         p('30건의 제목·본문과 전체 댓글·대댓글', heading), Spacer(1,15)]
sources = Counter(x['source_id'] for x in items)
states = Counter(x['status'] for x in items)
story += [p(f"자료 기준: {kst(data['exported_at'])}"),
          p(f"검수 30건 / 댓글 {sum(x['comment_count'] for x in items)}개 / 공개 {states['published']}건 / 게시 대기 {states['ready']}건"),
          p(f"출처: 뽐뿌 휴대폰포럼 {sources['ppomppu']}건, 디시 휴대폰갤러리 {sources['dcinside']}건"), Spacer(1,20),
          p('읽는 방법', heading),
          p('각 사례의 왼쪽은 Contabo에 저장된 원문, 오른쪽은 ChatGPT가 검수하여 등록한 재구성본입니다. 댓글은 원래 순서대로 모두 담았으며, 대댓글에는 연결된 상위 댓글 번호를 표시했습니다. 댓글이 없는 글도 0개로 명시합니다.'), Spacer(1,10),
          p('원본 작성일은 게시 데이터에도 유지됩니다. 이 문서의 공개/대기 표시는 자료를 내보낸 시점의 상태이며, 이후 순차 게시로 바뀔 수 있습니다. 원문의 가격·경험·주장은 작성자의 당시 표현을 대조하기 위한 자료로, 현재 가격이나 확인된 서비스 정책을 뜻하지 않습니다.'), Spacer(1,10),
          p('본문 글자 수는 공백·줄바꿈을 포함한 Unicode 문자 수입니다. 원문 10~2000자에서 최소 변화율은 30%에서 3%까지 선형으로 감소합니다. 변경 글자 수는 정수로 올림하므로 짧은 글의 실제 비율은 30%를 소폭 넘을 수 있습니다. 출처 안내 문구는 길이 계산에서 제외합니다.'), Spacer(1,10),
          p('원문 출처 URL과 수집·검수 시각을 사례마다 기록했습니다. 작성자 닉네임은 이 자료의 비교 대상이 아니며, 공개 사이트의 데모 계정은 원문 작성자와 별개입니다. 댓글의 작성 시각은 비교 자료에 포함하지 않습니다.'), Spacer(1,18),
          p('검증 범위', heading),
          p('30건 모두 본문 길이 조건, 본문·댓글 수치 보존, 댓글 수와 대댓글 연결을 검사했습니다. 원문은 임의로 축약하지 않았고, 기사 링크나 연락처에 의존하는 자료 및 불완전한 댓글 자료는 이번 묶음에서 제외했습니다.')]

for i, x in enumerate(items, 1):
    r = x['rewrite']; orig = x['comments']; revised = r['comments']
    assert x['comments_complete'] and len(orig) == x['comment_count'] == len(revised)
    assert [v.get('parentIndex') for v in orig] == [v.get('parentIndex') for v in revised]
    n, m = count(x['content']), count(r['content'])
    minimum = math.ceil(n * (.30 - (min(2000,max(10,n))-10)/1990*.27))
    assert minimum <= abs(n-m) <= math.ceil(n*.30)
    source_name = '뽐뿌 휴대폰포럼' if x['source_id']=='ppomppu' else '디시 휴대폰갤러리'
    story += [PageBreak(), p(f'{i:02d} / 30  {source_name}', title),
              p(f"원문 작성 {kst(x['authored_at'])} | {'공개' if x['status']=='published' else '게시 대기'}", small),
              p(f"수집 {kst(x['collected_at'])} | 검수 {kst(x['reviewed_at'])}", small),
              p(f"본문 {n} → {m}자 | 차이 {abs(n-m)}자 ({abs(n-m)/n*100:.2f}%) | 최소 {minimum}자 | 댓글 {len(orig)}개", small),
              Paragraph(f'<link href="{escape(x["url"])}" color="#5633B8">{escape(x["url"])}</link>', small),
              p(f"원본 식별자: {x['id']}", small), Spacer(1,10),
              table([[p('원문',label),p('재구성본',label)],
                     [p(x['title'],heading),p(r['title'],heading)],
                     [p(x['content']),p(r['content'])]]), Spacer(1,12), p('전체 댓글·대댓글',heading)]
    if not orig:
        story += [p('원문 0개 / 재구성본 0개. 댓글을 추가하지 않았습니다.',small)]
    else:
        rows = [[p('원문 댓글',label),p('재구성 댓글',label)]]
        for j, (a,b) in enumerate(zip(orig,revised),1):
            parent = a.get('parentIndex')
            connection = f'댓글 {j}' if parent is None else f'댓글 {j} · 댓글 {parent+1}에 대한 답글'
            rows.append([[p(connection,label),p(a['content'])], [p(connection,label),p(b['content'])]])
        story += [table(rows)]

doc = SimpleDocTemplate(str(OUT), pagesize=(595.28,841.89), leftMargin=44,rightMargin=44,
                        topMargin=42,bottomMargin=55, title='휴대폰 커뮤니티 원문·재구성 대조 30건',author='성지평가제 검수')
doc.build(story, onFirstPage=footer,onLaterPages=footer)
reader = PdfReader(OUT)
text = re.sub(r'\s+', '', '\n'.join(pg.extract_text() for pg in reader.pages))
missing=[]
for i,x in enumerate(items,1):
    r=x['rewrite']
    fields=[x['title'],x['content'],r['title'],r['content']]+[v['content'] for v in x['comments']+r['comments']]
    for s in fields:
        if re.sub(r'\s+','',s) not in text: missing.append([i,s])
assert not missing, missing
print(json.dumps({'output':str(OUT),'pages':len(reader.pages),'cases':len(items),'comments':sum(x['comment_count'] for x in items),'all_text_verified':True},ensure_ascii=False))
