# 코어 구현 참고

[README](../README.ko.md) | [English](./readme-reference.md)

README의 코어 코드 읽기 안내를 보존한 문서입니다. 내부 모듈은 추가 공개 export가 아닙니다.
애플리케이션 코드에는 [핵심 개념](./core-concepts.ko.mdx),
[필드 경로](./advanced/path-semantics.ko.mdx), [검증](./reference/validation.ko.mdx),
[제출과 초기화](./reference/submit-and-reset.ko.mdx)를 먼저 참고하세요.

이벤트 바인딩과 외부 값 동기화는 [React](./integrations/react.ko.mdx),
[Vue](./integrations/vue.ko.mdx), [Solid](./integrations/solid.ko.mdx),
[Svelte](./integrations/svelte.ko.mdx) 문서에서 다룹니다.

## Runtime flows

### 필드 명령

`src/core/form/CreateForm.ts`부터 읽으면 명령의 전체 순서를 볼 수 있다.

```txt
setValue -> 경로 정규화 -> store.setValue -> 필요하면 change 검증
blur     -> 경로 정규화 -> unfocus -> touch -> 필요하면 blur 검증
trigger  -> 경로 정규화 -> 지정 필드 또는 전체 검증
array    -> form이 공유하는 키 생성기로 controller 생성
submit   -> 제출 큐 -> 검증 -> callback -> 완료 처리
```

상태 변경은 동기적으로 알린다. Blur의 unfocus와 touch 알림은 각각 유지한다.
`dirty`는 기본값과의 `Object.is` 비교 결과이고, `modified`는 사용자 입력으로
변경되었는지를 기록한다. 두 flag의 의미는 다르다.

### 검증과 제출

지정 필드 검증은 local schema를 먼저 실행한 뒤 나머지 대상에 form schema를
적용한다. 전체 검증은 form schema 이후 등록된 local schema를 실행한다.
Local 결과는 빈 오류 목록을 포함해 form schema 결과보다 우선한다. Local schema가
없는 지정 필드 검증은 form 전체 schema를 실행하지만 지정 필드 오류만 기록한다.

비동기 단계마다 검증 revision과 캡처한 값이 유효한지 확인한다. 서로 다른 필드의
검증은 순서가 바뀌어 완료되어도 반영되지만, 겹치는 검증은 최신 결과를 덮어쓰면
안 된다. 오류는 기존처럼 필드별로 기록하며 새로운 일괄 알림을 도입하지 않는다.

`FormSubmitter`는 동시 제출을 큐에 넣는다. 시도 횟수는 즉시 증가시키고,
stale 검증은 다시 실행한다. Invalid이면 `onInvalid`, valid이면 현재 값으로
`onValid`를 호출하고, 대기 중인 제출이 모두 끝나면 submit 상태를 완료한다.

### 배열 변경

```txt
controller가 현재 값과 키를 읽음
  -> 정적 planner가 { values, keys, mapPreviousIndex } 계산
  -> store.replaceState(previousState => rebase(previousState, path, mutation))
  -> 다음 snapshot 한 번 반영
```

Rebaser는 전달받은 snapshot에서 값을 복원하고 다음 상태를 초기화한 뒤,
살아남은 자식 필드 메타데이터와 중첩 배열 키를 새 경로로 옮긴다. Errors, touched,
dirty, modified, focus는 item을 따라간다. 배열 밖 필드와 submit 상태는 보존한다.
Replace는 기존 자식 메타데이터를 버리고 새 키를 만든다. 기존 defaultValues
동작도 그대로 유지한다.

## Internal architecture

```txt
CreateForm                         공개 명령 순서와 공유 배열 키
  FormStateStore                   상태 소유와 쓰기
    FormStateInitializer           중첩 기본값 -> 정규화된 snapshot
    FormStateReader                snapshot -> 필드와 중첩 값
  ValidationEngine                 schema 등록과 검증 단계
    StandardSchemaValidator        schema 결과 -> 필드 오류
    ValidationSequencer            겹치는 검증의 revision
    ValidationSnapshot             캡처한 값과 배열 키 비교
  FormSubmitter                    제출 큐와 callback 수명
  FormArrayController              배열 읽기와 상태 반영
    FormArrayMutationPlanner       순수 배열 변경 계산
    FormArrayRebaser                이전 snapshot + 변경 결과 -> 다음 snapshot
```

React, Vue, Solid, Svelte adapter는 공개 `Form` 계약에 의존한다.
`adapters/`는 DOM 값·바인딩과 상태 집계를 공유하고, 구독과 컴포넌트 수명 관리는
각 framework 디렉터리에 남긴다.

## Core walkthrough

모든 import를 따라가기보다 아래 순서로 읽으면 된다.

| 알고 싶은 내용 | `src/core/` 아래 파일 | 책임 |
| --- | --- | --- |
| 공개 명령 다음에 무슨 일이 일어나는가? | `form/CreateForm.ts` | 경로 변환, 상태 변경, 검증 요청. |
| 상태는 어디서 바뀌는가? | `state/FormStateStore.ts` | store 소유와 immer 쓰기, reset·submit flag 반영. |
| 값을 어떻게 복원하는가? | `state/FormStateReader.ts` | 명시적으로 받은 snapshot의 정적 계산. Store나 getter를 소유하지 않는다. |
| 초기 상태는 어떻게 만드는가? | `state/FormStateInitializer.ts` | 배열과 일반 객체를 순회하고 빈 객체·특수 객체·원시값은 leaf로 유지. |
| 없는 필드는 어떻게 읽는가? | `state/FieldStateFactory.ts` | undefined 값, 새 오류 배열, isFocused를 포함한 false flag 생성. |
| 경로는 어떻게 표현하는가? | `path/FormPath.ts` | 문자열은 단일 segment, tuple은 JSON key, root는 `$`. |
| 중첩 값을 어떻게 변경하는가? | `value/ValueHelper.ts` | 불변 nested get/set과 fields·배열 container에서 값 복원. |
| 검증 결과는 언제 적용하는가? | `validation/ValidationEngine.ts` | Local schema 우선순위, 지정·전체 검증 실행, stale 판별. |
| 어느 검증이 이전 검증을 대체하는가? | `validation/ValidationSequencer.ts` | 전체·필드별 revision과 schema 등록에 따른 무효화. |
| 검증 중 값이 달라졌는가? | `validation/ValidationSnapshot.ts` | 필드 값과 배열 키 identity 캡처·비교. |
| Schema issue는 어떻게 변환하는가? | `validation/StandardSchemaValidator.ts` | Standard Schema issue 정규화. 없거나 지원하지 않는 경로는 root 오류. |
| 제출 순서는 어떻게 보장하는가? | `form/FormSubmitter.ts` | 제출 큐, stale 검증 재시도, 완료 상태 처리. |
| 다음 배열 순서는 무엇인가? | `array/FormArrayMutationPlanner.ts` | 인스턴스나 store 없이 정적 insert/push/remove/move/swap/replace 계산. |
| 메타데이터는 어떻게 item을 따라가는가? | `array/FormArrayRebaser.ts` | Store 접근이나 알림 없는 순수 snapshot 변환. |
| 배열 변경은 누가 반영하는가? | `array/FormArrayController.ts` | 배열 상태를 읽고 updater의 snapshot을 rebaser에 전달. |
| 배열 키는 어디서 만드는가? | `array/ArrayKeyGenerator.ts` | CreateForm마다 하나를 소유하고 새 controller들과 공유. |
| Index와 경로는 어떻게 옮기는가? | `array/ArrayItemReorder.ts`, `array/FormArrayPath.ts` | 순수 정렬·index mapping·자식 경로 교체. |

공개 surface는 `src/index.ts`와 framework entry point가 정의한다.
`core/types.ts`는 기존 경로·상태·schema·명령 계약을 설명한다.
내부 모듈은 구현 상세이며 새로운 package export가 아니다.

### `focus(path)`

`path`에 해당하는 field의 `isFocused`를 `true`로 바꾼다. 다른 field는 건드리지 않는다 — DOM이 이전에 focus 되어 있던 element에 자연스럽게 `blur` 이벤트를 발생시키므로, `blur()`를 통해 `isFocused`가 clearing된다. Array rebasing 시 `isFocused`는 `move`/`swap`/`insert`/`remove`에 대해 보존된다.

core는 DOM과 독립적이므로 여러 field에 `focus()`를 호출하면 둘 이상이 동시에 `isFocused: true`가 될 수 있다. DOM 어댑터에서는 브라우저가 자연스럽게 한 번에 하나로 제한하지만, core를 직접 사용할 때는 이전 field를 `blur()` 하는 것은 호출자의 책임이다. `useFormState().focusedField` aggregate는 **`Object.entries` 순서상 첫 번째**로 발견된 focused field를 반환하며, "가장 최근에 focus 된 field"가 아니다. 모든 focused field를 알려면 `state.fields`를 직접 순회하라.
