# @ilokesto/form

값, 필드 메타데이터, 검증과 제출을 관리하는 프레임워크 독립적인 TypeScript 폼 코어입니다.

[![npm](https://img.shields.io/npm/v/@ilokesto/form?style=flat&color=555)](https://www.npmjs.com/package/@ilokesto/form)
[![MIT](https://img.shields.io/badge/license-MIT-555?style=flat)](./LICENSE)

[문서](./docs/index.ko.mdx) | [API](./docs/reference/create-form.ko.mdx) | [English](./README.md)

- 명시적인 tuple 경로와 정규화된 필드 상태로 중첩 필드를 관리합니다.
- 필드별 스키마와 비동기 결과를 포함한 Standard Schema v1 검증을 지원합니다.
- 배열 항목의 메타데이터를 보존하며 React, Vue, Solid, Svelte 어댑터로 연결합니다.

## 설치

```sh
pnpm add @ilokesto/form
```

ESM과 TypeScript 선언을 제공하며 CommonJS `require()`는 지원하지 않습니다.
ESM import나 동적 `import()`를 사용하세요. 어댑터 하위 경로를 사용할 때는
해당 프레임워크도 설치하세요.

## 빠른 시작

폼을 만들고 중첩 필드를 변경한 뒤 현재 값을 제출합니다.

```ts
import { CreateForm } from '@ilokesto/form';

type LoginValues = {
  email: string;
  profile: {
    name: string;
  };
};

const form = new CreateForm<LoginValues>({
  defaultValues: {
    email: '',
    profile: {
      name: 'Ada',
    },
  },
});

form.setValue('email', 'ada@example.com', { source: 'user' });
form.setValue(['profile', 'name'], 'Grace', { source: 'user' });

console.log(form.getFieldState('email').dirty); // true
console.log(form.getValues().profile.name); // Grace

await form.submit(values => {
  console.log(values.email);
});
```

문자열은 실제 필드 이름입니다. `'profile.name'`과 `['profile', 'name']`은
서로 다른 필드를 가리킵니다. `getState()` 스냅샷은 읽기 전용으로 다루세요.
`dirty`는 기본값과의 비교이고 `modified`는 사용자 입력에 의한 변경 기록입니다.

이 예제에는 스키마가 없습니다. 검증하려면 Standard Schema 호환 `schema`를 추가하세요.
자동 검증의 기본 시점은 submit입니다. `setValue()`는 `void`를 반환하며
change 검증을 기다리지 않습니다. 검증 완료를 기다리려면 `trigger()`를 사용하세요.
배열의 `move()`와 `swap()`은 메타데이터를 유지하고 `replace()`는 의도적으로 버립니다.

어댑터는 `/react`, `/vue`, `/solid`, `/svelte`에 있으므로 루트는 프레임워크와
DOM을 import하지 않습니다. 생명주기 소유권과 외부 `values` 동기화는
각 프레임워크 가이드에서 확인하세요.

## 더 알아보기

- [핵심 개념과 필드 상태](./docs/core-concepts.ko.mdx)
- [프레임워크 어댑터 API](./docs/reference/adapter-use-form.ko.mdx)
- [검증과 필드별 스키마](./docs/reference/validation.ko.mdx)
- [배열 키와 메타데이터 재배치](./docs/advanced/array-rebasing.ko.mdx)
- [코어 코드 읽기, 실행 흐름과 프레임워크 가이드](./docs/readme-reference.ko.md)

<details>
<summary>개발</summary>

Node 22와 pnpm 10.17.1을 사용하고 저장소 루트에서 실행하세요.

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
pnpm test
pnpm test:pack
pnpm examples:build
pnpm examples:typecheck
pnpm test:tooling
pnpm migrate:verify
pnpm docs:publication:verify
pnpm docs:typecheck
pnpm docs:build
pnpm docs:test
```

빌드 결과는 `dist/`에 생성됩니다. `test:pack`은 레지스트리 Store를 사용하는 격리된
소비자를 검사하고 예제 명령은 다섯 private 예제를 모두 확인합니다.
전용 문서 사이트를 빌드한 뒤 `pnpm docs:start`로 로컬에서 실행합니다.

공식 영문·한국어 문서는 `docs/`에, 렌더러는 `website/`에 있습니다.
변경 불가능한 문서 기록과 마이그레이션 이력을 보존하세요.
PR은 Verify CI를 실행합니다. main 병합은 Changesets 릴리스 PR을 생성·갱신하며,
릴리스 PR을 병합하면 GitHub Actions가 성공한 Verify의 정확한 아티팩트만 게시합니다.
적용 전에 `Allow GitHub Actions to create and approve pull requests`를 켜고
`Production` 환경에 `NPM_TOKEN`을 설정하세요. 로컬 게시나 문서 배포는 하지 않습니다.

</details>
