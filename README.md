# 순대차 어드민

순대차(푸드트럭) 앱 운영용 Next.js 어드민입니다.

## 구성

- Next.js (App Router) + Tailwind + Noto Sans KR
- 백엔드: `sundae/backend-cf` (Cloudflare Workers + D1)
- 로그인: 관리자 아이디 / 비밀번호 (httpOnly 세션 쿠키)
- Worker 연동: 서버의 `SUNDAE_ADMIN_KEY`를 `X-Admin-Key`로 주입

## 로컬 실행

1. 백엔드 (`sundae/backend-cf`)

```bash
cd ../sundae/backend-cf
# .dev.vars 에 ADMIN_KEY 설정 (약한 키 금지)
npm run dev
```

2. 어드민

```bash
cp .env.example .env.local
# SUNDAE_ADMIN_ID / SUNDAE_ADMIN_PASSWORD / SUNDAE_ADMIN_KEY / SUNDAE_SESSION_SECRET 설정
# SUNDAE_ADMIN_KEY 는 backend-cf ADMIN_KEY 와 같아야 함
npm install
npm run dev
```

브라우저에서 http://localhost:3000 → 아이디·비밀번호로 로그인.

## 메뉴

- 푸드트럭 관리: 목록 / 시·도 필터 / 직접 등록(즉시 앱 반영) / 상세 수정
- 광고 관리 (배너): 준비중
- 결제정보: 준비중
