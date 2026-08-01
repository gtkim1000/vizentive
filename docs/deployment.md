# VIZENTIVE 배포 절차

## 프로덕션 배포 경로

```text
로컬 main 브랜치
→ GitHub: gtkim1000/vizentive (origin/main)
→ Vercel Git 자동 배포
→ 가비아 연결 도메인: https://www.vizentive.co.kr/
```

## 기본 배포 명령

```powershell
git push origin main
```

Vercel CLI나 별도 Vercel 플러그인을 설치하지 않는다. 기존 GitHub–Vercel 연동이 `main` 브랜치 푸시를 감지해 자동으로 프로덕션을 배포한다.

## 배포 확인

1. 로컬과 원격 커밋이 일치하는지 확인한다.
2. Vercel 자동 배포가 끝난 뒤 `https://www.vizentive.co.kr/`에서 확인한다.
3. 캐시가 남으면 브라우저에서 `Ctrl + F5`로 강력 새로고침한다.

## 현재 확인된 연결

- GitHub 저장소: `https://github.com/gtkim1000/vizentive.git`
- 배포 브랜치: `main`
- 프로덕션 도메인: `https://www.vizentive.co.kr/`
- DNS/도메인 관리: 가비아

