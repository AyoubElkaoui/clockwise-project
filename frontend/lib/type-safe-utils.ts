/**
 * Utility functions for handling type-safety in the application
 * to prevent runtime errors with null/undefined values
 */

/**
 * Safely accesses a property on an object without throwing errors
 * @param obj The object to access
 * @param key The property key to access
 * @param defaultValue Default value if property doesn't exist
 */
export function safeGet<T, K extends keyof T>(
  obj: T | null | undefined,
  key: K,
  defaultValue: T[K]
): T[K] {
  if (obj == null) return defaultValue;
  return obj[key] !== undefined ? obj[key] : defaultValue;
}

/**
 * Ensures a value is a number, or returns a default value
 * @param value The value to check
 * @param defaultValue Default value if not a valid number
 */
export function safeNumber(value: any, defaultValue: number = 0): number {
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
    return defaultValue;
  }
  return value;
}

/**
 * Safely formats a number with toFixed without errors
 * @param value The value to format
 * @param decimals Number of decimal places
 * @param defaultValue Default value if not a valid number
 */
export function safeToFixed(
  value: any, 
  decimals: number = 2, 
  defaultValue: string = '0' + (decimals > 0 ? '.' + '0'.repeat(decimals) : '')
): string {
  if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
    return defaultValue;
  }
  return value.toFixed(decimals);
}

/**
 * Ensures a value is an array, or returns an empty array
 * @param value The value to check
 */
export function safeArray<T>(value: any): T[] {
  if (Array.isArray(value)) {
    return value;
  }
  return [];
}

/**
 * Safely map over an array without throwing errors
 * @param arr The array to map over
 * @param mapFn The mapping function
 */
export function safeMap<T, U>(
  arr: T[] | null | undefined,
  mapFn: (item: T, index: number) => U
): U[] {
  if (!arr || !Array.isArray(arr)) return [];
  return arr.map(mapFn);
}

/**
 * Safely filters an array without throwing errors
 * @param arr The array to filter
 * @param filterFn The filter function
 */
export function safeFilter<T>(
  arr: T[] | null | undefined,
  filterFn: (item: T) => boolean
): T[] {
  if (!arr || !Array.isArray(arr)) return [];
  return arr.filter(filterFn);
}
