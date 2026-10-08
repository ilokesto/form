import { CreateForm } from '../../src/index';
import type { StandardSchemaV1 } from '../../src/index';

export type Values = {
  readonly email: string;
  readonly name: string;
};

export type Deferred<Result> = {
  readonly promise: Promise<Result>;
  readonly resolve: (result: Result) => void;
};

export const createDeferred = <Result>(): Deferred<Result> => {
  let settle: ((result: Result) => void) | undefined;
  const promise = new Promise<Result>((resolve) => {
    settle = resolve;
  });

  return {
    promise,
    resolve: (result) => {
      if (settle === undefined) throw new TypeError('Deferred promise was not initialized');
      settle(result);
    },
  };
};

export const createControlledSchema = <Output>() => {
  type Validation = Deferred<StandardSchemaV1.Result<Output>>;
  const validations: Validation[] = [];
  const starts: Deferred<Validation>[] = [];
  const schema = {
    '~standard': {
      validate: () => {
        const started = starts.shift();
        if (started === undefined) throw new TypeError('Register nextValidation before triggering validation');
        const validation = createDeferred<StandardSchemaV1.Result<Output>>();
        validations.push(validation);
        started.resolve(validation);
        return validation.promise;
      },
      vendor: 'validation-races',
      version: 1,
    },
  } satisfies StandardSchemaV1<unknown, Output>;

  return {
    schema,
    validations,
    // The test timeout bounds a missing start signal; no microtask or timer polling is needed.
    nextValidation: (): Promise<Validation> => {
      const started = createDeferred<Validation>();
      starts.push(started);
      return started.promise;
    },
  };
};

export const createControlledForm = () => {
  const controlled = createControlledSchema<Values>();
  return {
    ...controlled,
    form: new CreateForm({
      defaultValues: { email: '', name: '' },
      schema: controlled.schema,
    }),
  };
};
