/**
 * Array utility functions
 */

/**
 * Remove duplicates from array
 */
export const unique = <T>(array: T[]): T[] => {
  return [...new Set(array)];
};

/**
 * Remove duplicates by key
 */
export const uniqueBy = <T>(array: T[], key: keyof T): T[] => {
  const seen = new Set();
  return array.filter((item) => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
};

/**
 * Group array by key
 */
export const groupBy = <T>(array: T[], key: keyof T): Record<string, T[]> => {
  return array.reduce(
    (groups, item) => {
      const value = String(item[key]);
      if (!groups[value]) {
        groups[value] = [];
      }
      groups[value].push(item);
      return groups;
    },
    {} as Record<string, T[]>,
  );
};

/**
 * Sort array by key
 */
export const sortBy = <T>(array: T[], key: keyof T, order: "asc" | "desc" = "asc"): T[] => {
  return [...array].sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];

    if (aVal < bVal) return order === "asc" ? -1 : 1;
    if (aVal > bVal) return order === "asc" ? 1 : -1;
    return 0;
  });
};

/**
 * Chunk array into smaller arrays
 */
export const chunk = <T>(array: T[], size: number): T[][] => {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

/**
 * Flatten nested arrays
 */
export const flatten = <T>(array: (T | T[])[]): T[] => {
  return array.reduce<T[]>((flat, item) => {
    return flat.concat(Array.isArray(item) ? flatten(item) : [item]);
  }, []);
};

/**
 * Get random item from array
 */
export const randomItem = <T>(array: T[]): T | undefined => {
  if (array.length === 0) return undefined;
  return array[Math.floor(Math.random() * array.length)];
};

/**
 * Get random items from array
 */
export const randomItems = <T>(array: T[], count: number): T[] => {
  const shuffled = [...array].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

/**
 * Shuffle array
 */
export const shuffle = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Find intersection of arrays
 */
export const intersection = <T>(array1: T[], array2: T[]): T[] => {
  return array1.filter((item) => array2.includes(item));
};

/**
 * Find difference between arrays
 */
export const difference = <T>(array1: T[], array2: T[]): T[] => {
  return array1.filter((item) => !array2.includes(item));
};

/**
 * Find union of arrays
 */
export const union = <T>(array1: T[], array2: T[]): T[] => {
  return unique([...array1, ...array2]);
};

/**
 * Zip arrays together
 */
export const zip = <T, U>(array1: T[], array2: U[]): [T, U][] => {
  const length = Math.min(array1.length, array2.length);
  const result: [T, U][] = [];

  for (let i = 0; i < length; i++) {
    result.push([array1[i], array2[i]]);
  }

  return result;
};

/**
 * Unzip arrays
 */
export const unzip = <T, U>(zipped: [T, U][]): [T[], U[]] => {
  const array1: T[] = [];
  const array2: U[] = [];

  for (const [item1, item2] of zipped) {
    array1.push(item1);
    array2.push(item2);
  }

  return [array1, array2];
};

/**
 * Partition array into two arrays
 */
export const partition = <T>(array: T[], predicate: (item: T) => boolean): [T[], T[]] => {
  const truthy: T[] = [];
  const falsy: T[] = [];

  for (const item of array) {
    if (predicate(item)) {
      truthy.push(item);
    } else {
      falsy.push(item);
    }
  }

  return [truthy, falsy];
};

/**
 * Get first n items
 */
export const take = <T>(array: T[], n: number): T[] => {
  return array.slice(0, n);
};

/**
 * Get last n items
 */
export const takeLast = <T>(array: T[], n: number): T[] => {
  return array.slice(-n);
};

/**
 * Skip first n items
 */
export const skip = <T>(array: T[], n: number): T[] => {
  return array.slice(n);
};

/**
 * Skip last n items
 */
export const skipLast = <T>(array: T[], n: number): T[] => {
  return array.slice(0, -n);
};

/**
 * Get sum of array
 */
export const sum = (array: number[]): number => {
  return array.reduce((total, num) => total + num, 0);
};

/**
 * Get average of array
 */
export const average = (array: number[]): number => {
  if (array.length === 0) return 0;
  return sum(array) / array.length;
};

/**
 * Get minimum value
 */
export const min = (array: number[]): number => {
  return Math.min(...array);
};

/**
 * Get maximum value
 */
export const max = (array: number[]): number => {
  return Math.max(...array);
};

/**
 * Get median value
 */
export const median = (array: number[]): number => {
  if (array.length === 0) return 0;

  const sorted = [...array].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
};

/**
 * Get mode value
 */
export const mode = (array: number[]): number => {
  const frequency: Record<number, number> = {};

  for (const num of array) {
    frequency[num] = (frequency[num] || 0) + 1;
  }

  let maxFreq = 0;
  let mode = array[0];

  for (const [num, freq] of Object.entries(frequency)) {
    if (freq > maxFreq) {
      maxFreq = freq;
      mode = Number(num);
    }
  }

  return mode;
};
