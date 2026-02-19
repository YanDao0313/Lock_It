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

### 새 버전 배포

1. `package.json`의 `version` 수정
2. GitHub Token 설정(repo release 권한 필요)
3. 패키징/배포 실행

PowerShell 예시:

```powershell
$env:GH_TOKEN = "<your_github_token>"
yarn build:win
```

> `electron-builder`는 설정에 따라 설치 파일 및 업데이트 메타데이터를 GitHub Releases에 게시합니다.

## 프로젝트 구조(요약)

```text
src/
	main/       # Electron 메인 프로세스(window/tray/IPC/업데이트/스케줄러)
	preload/    # 보안 브리지 API(window.api)
	renderer/   # React UI(Setup / Settings / LockScreen)
```
