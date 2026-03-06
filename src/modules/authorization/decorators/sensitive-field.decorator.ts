import 'reflect-metadata';

const SENSITIVE_FIELD_KEY = 'sensitiveField';

/**
 * Marks an entity property as sensitive — it will be stripped from
 * the response unless the user has the specified permission key.
 *
 * @param permissionKey - The permission key to check (e.g. 'view_salary')
 *
 * @example
 * ```ts
 * @SensitiveField('view_salary')
 * @Column()
 * salary: number;
 * ```
 */
export function SensitiveField(permissionKey: string): PropertyDecorator {
  return (target: object, propertyKey: string | symbol) => {
    const existing: Map<string | symbol, string> =
      (Reflect.getMetadata(SENSITIVE_FIELD_KEY, target.constructor) as Map<
        string | symbol,
        string
      >) ?? new Map();
    existing.set(propertyKey, permissionKey);
    Reflect.defineMetadata(SENSITIVE_FIELD_KEY, existing, target.constructor);
  };
}

/** Retrieves the sensitive field map for a given class. */
export function getSensitiveFields(
  target: abstract new (...args: unknown[]) => unknown,
): Map<string | symbol, string> {
  return (
    (Reflect.getMetadata(SENSITIVE_FIELD_KEY, target) as Map<string | symbol, string>) ?? new Map()
  );
}
