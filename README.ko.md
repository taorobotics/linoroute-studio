# LinoRoute Studio

이미지와 동영상을 만들 수 있는 오픈 소스 AI 크리에이티브 워크스페이스입니다. 텍스트·이미지 기반 생성, 프롬프트 라이브러리와 브라우저 기반 작품 보관을 지원합니다.

언어: [English](README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md) · 한국어 · [Español](README.es.md) · [Français](README.fr.md)

## 링크

- **온라인 데모:** [studio.linoroute.com](https://studio.linoroute.com)
- **추천 API:** [LinoRoute](https://linoroute.com)
- **API 문서:** [ninoroute.com/tutorials](https://ninoroute.com/tutorials/00-intro)

API 키 없이 화면과 프롬프트 라이브러리를 둘러볼 수 있습니다. 실제 생성에는 본인의 API 키가 필요합니다. 기본 제공자는 LinoRoute이며, 다른 제공자는 모델 이름, 경로 및 응답 형식을 확인해야 합니다.

## 스크린샷

![이미지 워크스페이스](screenshots/image-workspace.png)

![비디오 워크스페이스](screenshots/video-workspace.png)

![이미지 프롬프트 라이브러리（데스크톱）](screenshots/image-prompt-library.png)

![비디오 프롬프트 라이브러리（데스크톱）](screenshots/video-prompt-library.png)

## 주요 기능

- GPT-image 이미지 생성 및 참조 이미지
- Seedance, MiniMax, Kling, Veo, Gemini 등의 비디오 모델
- 모델별 화면 비율, 해상도, 품질, 길이 설정
- 이미지·비디오 프롬프트 라이브러리
- 브라우저 기반 작품 및 로컬 파일 관리
- 선택 사항인 서명 URL 기반 OSS 저장소

## 보안

API Key를 저장소나 `VITE_*`/`NEXT_PUBLIC_*` 변수에 넣지 마세요. OSS AccessKey는 서버 서명기에만 보관해야 합니다. 자세한 내용은 [`SECURITY.md`](SECURITY.md)를 확인하세요.

## 개발

```bash
bun install
cp .env.example .env.local
bun run dev
```

호환 API 공개 URL은 `STUDIO_API_UPSTREAM`으로 변경할 수 있습니다. 라이선스는 [AGPL v3 이상](LICENSE)입니다.
