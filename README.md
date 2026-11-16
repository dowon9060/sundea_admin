# 순대차 어드민

순대차(푸드트럭) 앱 운영용 Next.js 어드민입니다.

## 구성

- Next.js (App Router) + Tailwind + Noto Sans KR
- 백엔드: `sundae/backend-cf` (Cloudflare Workers + D1)
- 인증: `ADMIN_KEY` (`X-Admin-Key`)

## 로컬 실행

1. 백엔드 (`sundae/backend-cf`)

```bash
cd ../sundae/backend-cf
# .dev.vars 에 ADMIN_KEY 설정 (약한 키 금지, 예: 24자 이상 랜덤)
npm run dev
```

2. 어드민

```bash
cp .env.example .env.local
npm install
npm run dev
```

브라우저에서 http://localhost:3000 → 로그인에 백엔드 `ADMIN_KEY` 입력.

## 메뉴

- 푸드트럭 관리: 목록 / 시·도 필터 / 직접 등록(즉시 앱 반영) / 상세 수정
- 광고 관리 (배너): 준비중
- 결제정보: 준비중
