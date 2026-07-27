# 📖 짬짬이 이야기

> 수업 전후 3~7분 자투리 시간, 짧은 이야기 하나로 학생이 생각하고 말하게 하는 전자칠판용 웹서비스.
> [짬짬이 게임](https://shway81-droid.github.io/jjam/) · [짬짬이 스트레칭](https://shway81-droid.github.io/jjam-stretch/)의 자매 프로젝트입니다.

## 특징

- **이야기 100편, 5개 유형** — 🔮 다음 이야기(예측) / 🕵️ 왜 그랬을까(추리) / 💗 마음 읽기(감정) / ⚖️ 선택 이야기(가치판단) / 💡 어떻게 할까(문제 해결)
- **근거 기반 콘텐츠 설계** — 아동 서사 몰입 연구·P4C·추론 지도·대화식 읽기 연구를 종합한 [이야기 작성 가이드라인](docs/이야기_작성_가이드라인.md) 기반. 모든 이야기가 클리프행어 구조 + 추론 단서 2~3개 + "우리 삶 경합형" 토론 질문을 갖춤
- **3·5·7분 모드** — 단계별 시간이 자동 배분된 진행 흐름 (이야기 → 생각 → 대화 → 발표 → 한 걸음 더)
- **딸깍 진행** — 단계별 타이머 자동 시작, 시간이 끝나면 [다음 단계] 버튼이 깜빡임 (자동 전환 없이 교사가 통제)
- **🎲 발표자 번호 뽑기** — 반 인원수 기억, 중복 없이 뽑기, 두구두구 연출
- **💡 힌트 / 🌱 예시 생각** — 필요할 때만 단계적으로 공개, "정답이 아니에요" 명시
- **⭐ 즐겨찾기 + 🕒 최근 사용 10편 자동 제외** — localStorage, 로그인 없음
- **선택은 3가지뿐** — 유형·학년·시간만 고르면 바로 시작(활동 방식 선택은 제거, 대화 단계는 짝·모둠 모두에 열려 있음)
- **전자칠판 최적화** — 본문 최소 32px 상당 큰 글씨, 뒷자리 가독성, 키보드 조작(Space 일시정지, → 다음 단계)
- **PWA 오프라인 지원** — 한 번 열면 인터넷 없이 동작
- **개인정보 제로** — 학생 이름·답변 저장 안 함

## 콘텐츠 안전 기준

가족의 죽음, 중증 질병, 폭력, 조롱, 높은 공포 수위, 정치·종교 소재는 제외합니다.
모든 이야기는 `sensitivity: "low"`만 노출됩니다.

## 콘텐츠 추가 방법

`data/stories.json`의 `stories` 배열에 아래 형식으로 추가하면 끝입니다. (빌드 불필요)

```json
{
  "id": "next-005",
  "title": "제목",
  "type": "next-story | why | mind | choice | solve",
  "grades": ["lower", "middle", "upper"],
  "durationOptions": [3, 5, 7],
  "story": ["문장1", "문장2"],
  "mainQuestion": "핵심 질문",
  "followUpQuestions": ["추가 질문"],
  "teacherGuide": ["진행 도움말"],
  "hint": "힌트 한 줄",
  "sampleIdeas": ["예시 생각 (정답 아님)"],
  "keywords": ["키워드"],
  "sensitivity": "low"
}
```

- 저학년 2~3문장, 중학년 3~5문장, 고학년 5~7문장 / 100~250자
- 정답을 직접 제시하지 않기, 예시 생각은 "~일 것 같아요" 톤

### 데이터 검증

이야기를 추가·수정한 뒤 아래를 실행하면 됩니다. (PR·푸시 시 CI가 동일하게 돌립니다)

```bash
node scripts/validate-data.mjs
```

필수 필드·`id` 중복·유형·학년·시간 모드를 확인하고, **런처가 실제로 보여 줄 수 있는 데이터인지**
까지 봅니다 — 예를 들어 `sensitivity`가 `"low"`가 아니면 목록에서 조용히 제외되므로 오류로
잡습니다. 판정 기준은 `js/app.js`의 `TYPES`·`GRADES`·`PLANS`에서 읽어 오므로, 상수를 고치고
데이터를 안 고치면 검증이 실패해 알려 줍니다. 본문 분량은 오류가 아닌 경고로만 알립니다.

## 기술 스택

- Vanilla HTML/CSS/JavaScript — 프레임워크·빌드 도구 없음
- `data/stories.json` + LocalStorage — 서버·DB 없음
- Service Worker (network-first) — 오프라인 + 콘텐츠 갱신 반영
- GitHub Pages 배포

## 아이콘

`icons/` 폴더의 SVG는 [Streamline Plump Color](https://github.com/webalys-hq/streamline-vectors)를
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) 조건으로 사용합니다(출처 표기 필수, 화면 하단에 표기).
`icons/button-pause-circle.svg`는 세트에 일시정지 아이콘이 없어 같은 스타일로 직접 만든 파일입니다.

아이콘을 교체할 때는 `js/app.js`의 `TYPES`(유형 5종)와 `ic()` 호출부,
`index.html`의 `img.ic`, `sw.js`의 `ICONS` 목록을 함께 수정해 주세요.

## 로컬 실행

```bash
npx http-server .   # fetch 사용으로 file:// 직접 열기는 불가
```

## 배포

GitHub Pages (master/main branch) — 정적 파일 그대로 배포하면 됩니다.

## 제품 원칙

> **짧은 이야기 하나로, 교사의 준비는 줄이고 학생의 생각과 말은 늘린다.**

`10초 안에 시작` · `한 화면에 한 단계` · `정답보다 근거와 상상`
