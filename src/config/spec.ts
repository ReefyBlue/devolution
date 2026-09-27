// Field specifications for the JSON profiles: one description drives the TypeScript type,
// the load-time check (every problem listed, unknown keys rejected) and the tuning panel.

export interface NumSpec {
  readonly kind: 'number';
  readonly min: number;
  readonly max: number;
  readonly unit: string;
  readonly step: number;
}
export interface IntSpec {
  readonly kind: 'integer';
  readonly min: number;
  readonly max: number;
}
export interface EnumSpec<T extends string = string> {
  readonly kind: 'enum';
  readonly values: readonly T[];
}
export interface BoolSpec {
  readonly kind: 'boolean';
}
export interface TextSpec {
  readonly kind: 'text';
  readonly pattern: RegExp;
}
export interface ObjSpec<F extends Record<string, Spec> = Record<string, Spec>> {
  readonly kind: 'object';
  readonly fields: F;
}
export interface ListSpec<I extends Spec = Spec> {
  readonly kind: 'list';
  readonly item: I;
  readonly minItems: number;
}
export interface MapSpec<V extends Spec = Spec> {
  readonly kind: 'map';
  readonly key: RegExp;
  readonly value: V;
}
export type Spec = NumSpec | IntSpec | EnumSpec | BoolSpec | TextSpec | ObjSpec | ListSpec | MapSpec;

export type Value<S> = S extends NumSpec | IntSpec
  ? number
  : S extends EnumSpec<infer T>
    ? T
    : S extends BoolSpec
      ? boolean
      : S extends TextSpec
        ? string
        : S extends ObjSpec<infer F>
          ? { [K in keyof F]: Value<F[K]> }
          : S extends ListSpec<infer I>
            ? Value<I>[]
            : S extends MapSpec<infer V>
              ? Record<string, Value<V>>
              : never;

export const num = (min: number, max: number, unit = '', step = 0.01): NumSpec => ({ kind: 'number', min, max, unit, step });
export const int = (min: number, max: number): IntSpec => ({ kind: 'integer', min, max });
export const oneOf = <T extends string>(...values: T[]): EnumSpec<T> => ({ kind: 'enum', values });
export const bool = (): BoolSpec => ({ kind: 'boolean' });
export const text = (pattern: RegExp): TextSpec => ({ kind: 'text', pattern });
export const obj = <F extends Record<string, Spec>>(fields: F): ObjSpec<F> => ({ kind: 'object', fields });
export const list = <I extends Spec>(item: I, minItems = 0): ListSpec<I> => ({ kind: 'list', item, minItems });
export const map = <V extends Spec>(key: RegExp, value: V): MapSpec<V> => ({ kind: 'map', key, value });

/** Returns every problem found, as "path: message" lines (empty = valid). */
export function check(spec: Spec, value: unknown, path: string): string[] {
  switch (spec.kind) {
    case 'number':
    case 'integer': {
      if (typeof value !== 'number' || !Number.isFinite(value)) return [`${path}: expected a number, found ${show(value)}`];
      if (spec.kind === 'integer' && !Number.isInteger(value)) return [`${path}: expected a whole number, found ${value}`];
      if (value < spec.min || value > spec.max) return [`${path}: ${value} is outside ${spec.min} … ${spec.max}`];
      return [];
    }
    case 'enum':
      return spec.values.includes(value as string) ? [] : [`${path}: ${show(value)} is not one of ${spec.values.join(', ')}`];
    case 'boolean':
      return typeof value === 'boolean' ? [] : [`${path}: expected true or false, found ${show(value)}`];
    case 'text':
      return typeof value === 'string' && spec.pattern.test(value) ? [] : [`${path}: ${show(value)} does not match ${spec.pattern}`];
    case 'list': {
      if (!Array.isArray(value)) return [`${path}: expected a list, found ${show(value)}`];
      const out = value.length < spec.minItems ? [`${path}: needs at least ${spec.minItems} item(s)`] : [];
      return out.concat(value.flatMap((v, i) => check(spec.item, v, `${path}[${i}]`)));
    }
    case 'map': {
      if (!isRecord(value)) return [`${path}: expected an object, found ${show(value)}`];
      return Object.entries(value).flatMap(([k, v]) =>
        spec.key.test(k) ? check(spec.value, v, `${path}.${k}`) : [`${path}: key "${k}" does not match ${spec.key}`],
      );
    }
    case 'object': {
      if (!isRecord(value)) return [`${path}: expected an object, found ${show(value)}`];
      const unknown = Object.keys(value)
        .filter((k) => !(k in spec.fields))
        .map((k) => `${path}: unknown field "${k}"`);
      const fields = Object.entries(spec.fields).flatMap(([k, s]) =>
        k in value ? check(s, value[k], `${path}.${k}`) : [`${path}: missing field "${k}"`],
      );
      return unknown.concat(fields);
    }
  }
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const show = (v: unknown): string => (typeof v === 'string' ? `"${v}"` : JSON.stringify(v) ?? String(v));
