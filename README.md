# 순대차 어드민

순대차(푸드트럭) 앱 운영용 Next.js 어드민입니다.

## 구성

- Next.js (App Router) + Tailwind + Noto Sans KR
- 백엔드: `sundae/backend-cf` (Cloudflare Workers + D1)
- 로그인: 관리자 이메일 / 비밀번호 (D1 `admins` + httpOnly 세션)
- Worker 연동: 서버의 `SUNDAE_ADMIN_KEY`를 `X-Admin-Key`로 주입

## 로컬 실행

1. 백엔드

```bash
cd ../sundae/backend-cf
npm run db:migrate:local
npm run dev
```

2. 어드민

```bash
cp .env.example .env.local
# SUNDAE_ADMIN_KEY = backend-cf ADMIN_KEY
# SUNDAE_SESSION_SECRET 설정
npm run dev
```

초기 관리자: `jiras90@gmail.com` / (시드된 임시 비밀번호)

## 메뉴

- 푸드트럭 관리
- 광고 관리 (배너): 준비중
- 결제정보: 준비중
- 내정보: 이름·이메일·비밀번호 수정
