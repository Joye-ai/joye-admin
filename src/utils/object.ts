/**
 * Object utility functions
 */

/**
 * Pick properties from object
 */
export const pick = <T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> => {
  const result = {} as Pick<T, K>;

  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }

  return result;
};

/**
 * Omit properties from object
 */
export const omit = <T extends Record<string, any>, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> => {
  const result = { ...obj };

  for (const key of keys) {
    delete result[key];
  }

  return result;
};

/**
 * Get object keys
 */
export const keys = <T extends Record<string, any>>(obj: T): (keyof T)[] => {
  return Object.keys(obj) as (keyof T)[];
};

/**
 * Get object values
 */
export const values = <T extends Record<string, any>>(obj: T): T[keyof T][] => {
  return Object.values(obj);
};

/**
 * Get object entries
 */
export const entries = <T extends Record<string, any>>(obj: T): [keyof T, T[keyof T]][] => {
  return Object.entries(obj) as [keyof T, T[keyof T]][];
};

/**
 * Invert object keys and values
 */
export const invert = <T extends Record<string, string>>(obj: T): Record<string, string> => {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(obj)) {
    result[value] = key;
  }

  return result;
};

/**
 * Map object values
 */
export const mapValues = <T extends Record<string, any>, U>(
  obj: T,
  mapper: (value: T[keyof T], key: keyof T) => U,
): Record<keyof T, U> => {
  const result = {} as Record<keyof T, U>;

  for (const [key, value] of Object.entries(obj)) {
    result[key as keyof T] = mapper(value, key as keyof T);
  }

  return result;
};

/**
 * Map object keys
 */
export const mapKeys = <T extends Record<string, any>>(
  obj: T,
  mapper: (key: keyof T, value: T[keyof T]) => string,
): Record<string, T[keyof T]> => {
  const result: Record<string, T[keyof T]> = {};

  for (const [key, value] of Object.entries(obj)) {
    result[mapper(key as keyof T, value)] = value;
  }

  return result;
};

/**
 * Filter object properties
 */
export const filterObject = <T extends Record<string, any>>(
  obj: T,
  predicate: (value: T[keyof T], key: keyof T) => boolean,
): Partial<T> => {
  const result: Partial<T> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (predicate(value, key as keyof T)) {
      result[key as keyof T] = value;
    }
  }

  return result;
};

/**
 * Check if object is empty
 */
export const isEmpty = (obj: Record<string, any>): boolean => {
  return Object.keys(obj).length === 0;
};

/**
 * Check if object has property
 */
export const has = (obj: Record<string, any>, key: string): boolean => {
  return Object.prototype.hasOwnProperty.call(obj, key);
};

/**
 * Get nested property value
 */
export const get = (obj: any, path: string, defaultValue?: any): any => {
  const keys = path.split(".");
  let result = obj;

  for (const key of keys) {
    if (result === null || result === undefined) {
      return defaultValue;
    }
    result = result[key];
  }

  return result !== undefined ? result : defaultValue;
};

/**
 * Set nested property value
 */
export const set = (obj: any, path: string, value: any): any => {
  const keys = path.split(".");
  const lastKey = keys.pop()!;
  let current = obj;

  for (const key of keys) {
    if (!(key in current) || typeof current[key] !== "object") {
      current[key] = {};
    }
    current = current[key];
  }

  current[lastKey] = value;
  return obj;
};

/**
 * Deep merge objects
 */
export const merge = <T extends Record<string, any>>(target: T, ...sources: Partial<T>[]): T => {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        merge(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return merge(target, ...sources);
};

/**
 * Check if value is object
 */
export const isObject = (item: any): boolean => {
  return item && typeof item === "object" && !Array.isArray(item);
};

/**
 * Clone object deeply
 */
export const clone = <T>(obj: T): T => {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as any;
  if (Array.isArray(obj)) return obj.map((item) => clone(item)) as any;
  if (typeof obj === "object") {
    const clonedObj = {} as any;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = clone(obj[key]);
      }
    }
    return clonedObj;
  }
  return obj;
};

/**
 * Compare objects deeply
 */
export const isEqual = (obj1: any, obj2: any): boolean => {
  if (obj1 === obj2) return true;

  if (obj1 == null || obj2 == null) return false;

  if (typeof obj1 !== typeof obj2) return false;

  if (typeof obj1 !== "object") return obj1 === obj2;

  if (Array.isArray(obj1) !== Array.isArray(obj2)) return false;

  if (Array.isArray(obj1)) {
    if (obj1.length !== obj2.length) return false;
    for (let i = 0; i < obj1.length; i++) {
      if (!isEqual(obj1[i], obj2[i])) return false;
    }
    return true;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!isEqual(obj1[key], obj2[key])) return false;
  }

  return true;
};

/**
 * Transform object keys
 */
export const transformKeys = <T extends Record<string, any>>(
  obj: T,
  transformer: (key: string) => string,
): Record<string, any> => {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    result[transformer(key)] = value;
  }

  return result;
};

/**
 * Transform object values
 */
export const transformValues = <T extends Record<string, any>, U>(
  obj: T,
  transformer: (value: T[keyof T]) => U,
): Record<keyof T, U> => {
  const result = {} as Record<keyof T, U>;

  for (const [key, value] of Object.entries(obj)) {
    result[key as keyof T] = transformer(value);
  }

  return result;
};
