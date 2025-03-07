export type ContravariantFunction<T> = (_: T) => never;
export type ToContravariantFunction<T> = T extends unknown
    ? ContravariantFunction<T>
    : never;

export type CovariantFunction<T> = () => T;
export type ToCovariantFunction<T> = T extends unknown
    ? CovariantFunction<T>
    : never;

export type UnionToIntersection<T> =
    ToContravariantFunction<T> extends ContravariantFunction<infer U>
        ? U
        : never;

export type LastOfUnion<T> = UnionToIntersection<
    ToCovariantFunction<T>
> extends CovariantFunction<infer R>
    ? R
    : never;

export type UnionToTuple<
    T,
    N = [T] extends [never] ? true : false,
> = true extends N
    ? []
    : [...UnionToTuple<Exclude<T, LastOfUnion<T>>>, LastOfUnion<T>];

export type ObjectEntries<T> = UnionToTuple<
    { [K in keyof T]: [K, T[K]] }[keyof T]
>;

export function objectEntries<R extends Record<string, unknown>>(
    obj: R,
): ObjectEntries<R> {
    return Object.entries(obj) as ObjectEntries<R>; // only ok to cast bc we are absolutely sure
}
