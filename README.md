# 순대차 어드민

순대차(푸드트럭) 앱 운영용 Next.js 어드민입니다.

## 구성

- Next.js (App Router) + Tailwind + Noto Sans KR
- 백엔드: `sundae/backend-cf` (Cloudflare Workers + D1)
- 로그인: 관리자 이메일 / 비밀번호 (D1 `admins` + httpOnly 세션)
- Worker 연동: 서버의 `SUNDAE_ADMIN_KEY`를 `X-Admin-Key`로 주입

## 환경 변수

`SUNDAE_API_URL`이 가리키는 Worker/D1에 가게가 저장됩니다. **앱(운영)에 바로 보이게 하려면 운영 Worker URL을 쓰세요.**

| 변수 | 설명 |
| --- | --- |
| `SUNDAE_API_URL` | 기본값 권장: `https://sundaecha-api.jiras90.workers.dev` |
| `SUNDAE_ADMIN_KEY` | Worker `ADMIN_KEY` 시크릿과 동일 |
| `SUNDAE_SESSION_SECRET` | 어드민 세션 서명 |
| `NEXT_PUBLIC_NCP_KEY_ID` | 앱과 동일한 네이버 Maps Client ID |

로컬 Worker만 쓰려면 `SUNDAE_API_URL=http://127.0.0.1:8787` 과 로컬 `.dev.vars`의 `ADMIN_KEY`를 맞춥니다. 이 경우 저장분은 앱 운영 빌드에 안 보입니다.

## 로컬 실행

1. (선택) 로컬 백엔드 — 운영 API만 쓸 때는 생략 가능

```bash
cd ../sundae/backend-cf
npm run db:migrate:local
npm run dev
```

2. 어드민

```bash
cp .env.example .env.local
# SUNDAE_API_URL / SUNDAE_ADMIN_KEY / SUNDAE_SESSION_SECRET / NEXT_PUBLIC_NCP_KEY_ID 설정
npm run dev
```

초기 관리자: `jiras90@gmail.com` / (시드된 임시 비밀번호)

주소 검색·지도로 보기는 네이버 지도(앱과 동일 NCP 키)를 사용합니다.  
NCP 콘솔 Web 서비스 URL에 `http://localhost:3000`(또는 사용 포트)을 등록하세요.  
운영 API에 연결한 뒤 저장하면 앱에 반영됩니다.

## 메뉴

- 푸드트럭 관리
- 광고 관리 (배너): 준비중
- 결제정보: 준비중
- 내정보: 이름·이메일·비밀번호 수정
