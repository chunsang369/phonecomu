import { NextRequest, NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: '업로드할 파일이 없습니다.' }, { status: 400 })
    }

    // 파일 타입 체크
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: '이미지 파일만 업로드할 수 있습니다.' }, { status: 400 })
    }

    // 버퍼 변환
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // 파일명 생성 (유니크 시간 기원)
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    const originalName = file.name || 'image.png'
    const extension = originalName.split('.').pop() || 'png'
    const filename = `${uniqueSuffix}.${extension}`

    // 저장 폴더 확인 및 생성 (public/uploads/)
    const uploadDir = join(process.cwd(), 'public', 'uploads')
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true })
    }

    const filepath = join(uploadDir, filename)
    await writeFile(filepath, buffer)

    console.log(`[업로드 성공] 파일 저장 경로: ${filepath}`)

    // 클라이언트용 접근 상대 URL 리턴
    return NextResponse.json({ url: `/uploads/${filename}` })
  } catch (err: any) {
    console.error('이미지 업로드 에러:', err)
    return NextResponse.json({ error: '서버 내부 업로드 처리 중 오류 발생' }, { status: 500 })
  }
}
