---
name: verify-deploy
description: Confirm a change is actually live before telling the user it's deployed. This project had a real incident where `git push` succeeded but GitHub Actions silently kept failing, so the site stayed stale for multiple commits while everyone assumed it had shipped. Use after any push or deploy that's supposed to reach production.
user-invocable: true
allowed-tools:
  - Bash(git log *)
  - Bash(git push *)
  - Bash(gh *)
  - Bash(curl *)
  - WebFetch
---

# verify-deploy — "배포됩니다" 라고 말하기 전에 확인

**`git push` 성공 ≠ 실제 라이브 반영.** 2026-06-25에 GitHub Actions의 Firebase
Hosting 배포 스텝이 특정 커밋부터 연속 실패하고 있었는데, push 자체는 계속
성공해서 한동안 아무도 눈치 못 챈 사고가 있었다. 이 프로젝트는 이제 이 확인
없이는 "배포됐다"고 단정하지 않는다.

## 절차 (GitHub Actions로 배포되는 경우)

1. `git push` 후, 바로 "배포됩니다"라고 말하지 않는다.
2. `gh`가 있으면: `gh run list --limit 1` 또는
   `gh api repos/<owner>/<repo>/actions/runs?per_page=1`로 최신 워크플로우
   실행의 `conclusion`을 확인한다.
3. `gh` 인증이 안 돼 있으면 `https://api.github.com/repos/<owner>/<repo>/actions/runs?per_page=1`
   를 `curl`/`WebFetch`로 조회 시도 — 다만 private 정보라 403이 나올 수 있음
   (과거에 실제로 로그 접근이 403으로 막혔던 이력 있음). 이 경우 솔직하게
   "GitHub 쪽 실행 결과를 여기서 직접 못 봅니다, Actions 탭에서 확인해주세요"
   라고 사용자에게 말한다 — 확인 안 된 걸 확인된 것처럼 말하지 않는다.
4. `conclusion`이 `success`가 아니면(failure/cancelled 등) 그대로 사용자에게
   보고하고, 재실행("Re-run failed jobs")이나 시크릿(`FIREBASE_SERVICE_ACCOUNT`
   등) 갱신이 필요할 수 있다고 안내한다.

## 절차 (`firebase deploy` CLI로 직접 배포하는 경우)

1. CLI 배포는 커맨드 자체가 동기적으로 성공/실패를 반환하므로 exit code를
   확인하면 충분하다 — 이 경로는 GitHub Actions 경유보다 신뢰도가 높다.
2. 그래도 가능하면 배포 직후 실제 URL을 `curl -s -o /dev/null -w '%{http_code}'`
   등으로 한 번 찔러보거나, 캐시버스팅된 리소스(`?v=` 새 버전)가 실제로
   서빙되는지 확인하는 편이 안전하다(브라우저 캐시/CDN 지연 가능성).

## 하지 말 것

- push/deploy 명령의 "명령 실행 성공" 메시지만 보고 사용자에게 "적용됐습니다"
  라고 말하지 말 것 — 이 프로젝트는 그 가정이 실제로 틀렸던 전례가 있다.
