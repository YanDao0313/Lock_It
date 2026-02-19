# Lock It

`Lock It`은 Electron + React + TypeScript 기반의 데스크톱 자동 잠금 도구로, 교실·실험실·사무실 환경에 적합합니다.  
**이 프로젝트는 엔터테인먼트용이며, 운영 환경에서는 사용하지 마세요.** 운영 사용으로 인한 결과는 사용자 책임입니다.

## 언어 문서

- 简体中文（默认）: [README.md](./README.md)
- English (AI Translation): [README.en-US.md](./README.en-US.md)
- 日本語（AI 翻訳）: [README.ja-JP.md](./README.ja-JP.md)
- 한국어（AI 번역）: 이 파일

## 주요 기능

- 주간 자동 잠금 스케줄(요일별 다중 시간대)
- 6자리 고정 PIN 잠금 해제 + 선택형 TOTP 잠금 해제
- TOTP QR 바인딩(디바이스 이름 형식: `LockIt - [DeviceName]`)
  - 디바이스 식별명은 2차 확인 후 잠금되어 변경 불가
- 잠금 화면 스타일 커스터마이징(문구/색상/시간 표시/폰트 설정)
- 잠금 해제 시 사진 촬영 및 감사 기록(성공/실패, 시도 횟수, 해제 방식)
- 전체 기록 삭제 전 비밀번호 검증(global fixed / both 설정 준수)
- 시스템 트레이 상주 실행
- 최초 실행 설정 마법사(Setup)

## 기술 스택

- Electron `^39.2.6`
- React `^19.2.1`
- TypeScript `^5.9.3`
- electron-vite `^5.0.0`
- Tailwind CSS `^4.1.18`
- electron-store `^11.0.2`
- otplib `^13.3.0`
- qrcode `^1.5.4`

## 개발

의존성 설치:

```bash
yarn
```

개발 실행:

```bash
yarn dev
```

타입 체크:

```bash
yarn typecheck
```

## 빌드 및 패키징

```bash
# Windows
yarn build:win

# macOS
yarn build:mac

# Linux
yarn build:linux

# 로컬 언패키지 빌드(테스트용)
yarn build:unpack
```

## 자동 업데이트

이 프로젝트는 `electron-updater` + GitHub Releases로 구성되어 있습니다.

- 배포 설정: `electron-builder.yml`
  - `provider: github`
  - `owner: YanDao0313`
  - `repo: Lock_It`
- 운영 환경에서 앱 시작 후 자동으로 업데이트를 확인하고 다운로드
- 다운로드 완료 시 앱 종료 시점에 자동 설치

### 앱 내 업데이트 채널

`설정` -> `About` -> `Software Update`에서 다음 채널을 선택할 수 있습니다.

- `Stable`: 정식 Release만 수신
- `Preview / Prerelease`: `main`에서 자동 발행되는 사전 릴리스 수신

> 채널 변경 후 저장하고, `지금 확인`을 실행하세요.

### GitHub Actions 자동 배포

다음 2개 워크플로가 설정되어 있습니다.

- `.github/workflows/preview-release.yml`
  - 트리거: `main` push마다
  - 동작: 프리뷰 채널용 `Prerelease` 자동 빌드/배포
  - 버전 형식: `x.y.z-preview.<short_sha>` (예: `1.2.3-preview.a1b2c3d4`)
  - Release Notes: 프리뷰 구간의 커밋 기록으로 자동 생성

- `.github/workflows/release.yml`
  - 트리거: 수동 `workflow_dispatch`
  - 동작: 입력한 버전으로 정식 `Release` 배포
  - 선택 입력 `extra_notes` 지원(비워도 됨)
  - Release Notes: 커밋 기반 내용 + `extra_notes`

### 정식 릴리스 절차(권장)

1. GitHub `Actions` -> `Official Release` 열기
2. `Run workflow` 클릭 후 버전 입력(예: `1.2.3`)
3. 필요하면 `extra_notes` 입력(비워도 가능)
4. 멀티 플랫폼 작업 완료 후 Release에 자동 게시

### 권한 및 토큰

- 워크플로는 `secrets.GITHUB_TOKEN` 사용
- 저장소 Actions 권한에서 `Read and write permissions` 필요
- 조직 저장소인 경우 Release 생성/수정 허용 정책 확인

> `electron-builder`는 설정에 따라 설치 파일 및 업데이트 메타데이터를 GitHub Releases에 게시합니다.

## 프로젝트 구조(요약)

```text
src/
	main/       # Electron 메인 프로세스(window/tray/IPC/업데이트/스케줄러)
	preload/    # 보안 브리지 API(window.api)
	renderer/   # React UI(Setup / Settings / LockScreen)
```
