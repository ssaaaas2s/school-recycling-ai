# 우리 학교 AI 분리수거 도우미 v2

실제 이미지 분석 AI를 서버에서 호출하도록 만든 프로토타입입니다.

## 1. 준비
Node.js 18+ 권장.

## 2. 설치
```bash
npm install
```

## 3. API 키 설정
`.env`를 직접 만들거나 터미널에서 환경변수를 설정하세요.

```text
OPENAI_API_KEY=여기에_API_키
PORT=3000
```

Windows PowerShell 예:
```powershell
$env:OPENAI_API_KEY="sk-..."
npm start
```

macOS/Linux:
```bash
export OPENAI_API_KEY="sk-..."
npm start
```

## 4. 실행
```bash
npm start
```
브라우저에서 `http://localhost:3000` 접속.

## AI 동작
- 사진 속 대상이 사람/동물/일반 물체 등 쓰레기가 아니면 `is_trash=false`
- 쓰레기라면 물체 이름, 예상 재질, 분류, 배출함, 준비사항, 이유, 확신도를 JSON으로 반환
- 이미지 입력은 서버에서 OpenAI Responses API로 전달
- API 키는 브라우저 코드에 넣지 않고 서버 환경변수로만 사용

실제 학교에 배포하기 전에는 학교별 분리배출 기준을 프롬프트/설정에 추가하고, 개인정보 및 이미지 보관 정책을 별도로 검토하세요.
