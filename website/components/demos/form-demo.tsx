'use client';

import type { StandardSchemaV1 } from '@ilokesto/form';
import { useForm } from '@ilokesto/form/react';
import { useId, useState } from 'react';

import styles from '../landings/store-landing.module.css';
import {
  DemoFrame,
  type DemoProps,
  demoButtonClass,
  demoInputClass,
  demoSecondaryButtonClass,
} from './demo-frame';

type FormValues = { email: string; role: 'member' | 'admin' };

const defaultValues: FormValues = { email: '', role: 'member' };

const inviteSchema: StandardSchemaV1<unknown, FormValues> = {
  '~standard': {
    version: 1,
    vendor: 'ilokesto-docs',
    validate(value) {
      if (typeof value !== 'object' || value === null || !('email' in value)) {
        return { issues: [{ message: 'invalid_email', path: ['email'] }] };
      }

      const email = value.email;
      if (typeof email !== 'string' || email.length > 64 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { issues: [{ message: 'invalid_email', path: ['email'] }] };
      }

      if (!('role' in value) || (value.role !== 'member' && value.role !== 'admin')) {
        return { issues: [{ message: 'invalid_role', path: ['role'] }] };
      }

      return { value: { email, role: value.role } };
    },
  },
};

const code = `const form = useForm({
  defaultValues, schema: inviteSchema,
  validateOn: ['submit'],
});
const email = form.useField({
  name: 'email', type: 'email',
});
const submit = form.handleSubmit(
  setResult, () => setResult(null),
);`;

export function FormDemo({ lang }: DemoProps) {
  const copy = lang === 'ko'
    ? {
        title: '팀원 초대',
        description: '이메일과 역할을 입력해 초대 정보를 검증하세요. 실제 이메일은 전송하지 않습니다.',
        label: '이메일 (필수)',
        placeholder: 'you@team.io',
        invalid: '올바른 이메일을 입력하세요.',
        role: '팀 역할',
        member: '팀원',
        admin: '관리자',
        invalidRole: '역할을 선택하세요.',
        submit: '초대 확인',
        reset: '초기화',
        success: (role: FormValues['role']) => `${role === 'admin' ? '관리자' : '팀원'} 초대 준비 완료`,
        attempts: (count: number) => `제출 횟수: ${count}`,
      }
    : {
        title: 'Invite a teammate',
        description: 'Validate an email and team role to prepare an invitation. No email is sent.',
        label: 'Email (required)',
        placeholder: 'you@team.io',
        invalid: 'Enter a valid email.',
        role: 'Team role',
        member: 'Member',
        admin: 'Admin',
        invalidRole: 'Choose a team role.',
        submit: 'Check invite',
        reset: 'Reset',
        success: (role: FormValues['role']) => `${role === 'admin' ? 'Admin' : 'Member'} invite ready.`,
        attempts: (count: number) => `Submit attempts: ${count}`,
      };
  const [result, setResult] = useState<FormValues | null>(null);
  const { form, handleSubmit, useField, useFormState } = useForm({
    defaultValues,
    schema: inviteSchema,
    validateOn: ['submit'],
  });
  const email = useField({ name: 'email', type: 'email' });
  const role = useField<HTMLSelectElement>({ name: 'role' });
  const state = useFormState();
  const inputId = useId();
  const errorId = `${inputId}-error`;
  const roleId = `${inputId}-role`;
  const roleErrorId = `${roleId}-error`;
  const submit = handleSubmit(setResult, () => setResult(null));

  const reset = () => {
    form.reset();
    setResult(null);
  };

  return (
    <DemoFrame lang={lang} name="form" title={copy.title} description={copy.description} code={code}>
      <form
        className="space-y-3"
        noValidate
        onSubmit={submit}
      >
        <div className={styles.demoFields}>
        <div className={styles.demoField}>
          <label htmlFor={inputId} className="block text-sm font-medium text-fd-foreground">
            {copy.label}
          </label>
          <input
            {...email.props}
            id={inputId}
            data-demo-input="form-email"
            className={demoInputClass}
            placeholder={copy.placeholder}
            autoComplete="email"
            maxLength={64}
            required
            aria-invalid={email.errors.length > 0}
            aria-describedby={email.errors.length > 0 ? errorId : undefined}
          />
          <p id={errorId} data-demo-result="form-error" role="status" className="h-5 text-xs font-medium leading-5 text-fd-primary">
            {email.errors.length > 0 ? copy.invalid : ''}
          </p>
        </div>
        <div className={styles.demoField}>
          <label htmlFor={roleId} className="block text-sm font-medium text-fd-foreground">
            {copy.role}
          </label>
          <select
            {...role.props}
            id={roleId}
            data-demo-input="form-role"
            className={demoInputClass}
            aria-invalid={role.errors.length > 0}
            aria-describedby={role.errors.length > 0 ? roleErrorId : undefined}
          >
            <option value="member">{copy.member}</option>
            <option value="admin">{copy.admin}</option>
          </select>
          <p id={roleErrorId} role="status" className="h-5 text-xs font-medium leading-5 text-fd-primary">
            {role.errors.length > 0 ? copy.invalidRole : ''}
          </p>
        </div>
        </div>
        <div className={styles.demoToolbar}>
          <button
            type="submit"
            data-demo-action="form-submit"
            className={demoButtonClass}
            disabled={state.isSubmitting}
          >
            {copy.submit}
          </button>
          <button
            type="button"
            data-demo-action="form-reset"
            className={demoSecondaryButtonClass}
            onClick={reset}
          >
            {copy.reset}
          </button>
        </div>
        <div className={styles.demoStatus}>
          <p data-demo-result="form-submit-count" className="text-xs text-fd-muted-foreground">
            {copy.attempts(state.submitCount)}
          </p>
          <p data-demo-result="form-success" role="status" className="h-5 min-w-0 break-words text-sm font-medium leading-5 text-fd-foreground">
            {result ? copy.success(result.role) : ''}
          </p>
        </div>
      </form>
    </DemoFrame>
  );
}
