// lib/type-safe-utils.ts

/**
 * Ensures a value is an array of type T, or returns empty array if not
 */
export function ensureArray<T>(value: any): T[] {
    if (Array.isArray(value)) {
        return value as T[];
    }
    return [];
}

/**
 * Alias for ensureArray for consistent naming
 */
export function safeArray<T>(value: any): T[] {
    return ensureArray<T>(value);
}

/**
 * Safely maps over an array, handling null/undefined arrays
 */
export function safeMap<T, R>(
    array: T[] | null | undefined,
    callback: (item: T, index: number, array: T[]) => R
): R[] {
    if (!array) return [];
    try {
        return ensureArray<T>(array).map(callback);
    } catch (error) {
        console.error('safeMap error:', error);
        return [];
    }
}

/**
 * Safely filters an array, handling null/undefined arrays
 */
export function safeFilter<T>(
    array: T[] | null | undefined,
    callback: (item: T, index: number, array: T[]) => boolean
): T[] {
    if (!array) return [];
    try {
        return ensureArray<T>(array).filter(callback);
    } catch (error) {
        console.error('safeFilter error:', error);
        return [];
    }
}

/**
 * Safely accesses a property with fallback value
 */
export function safeProp<T>(obj: any, prop: string, fallback: T): T {
    if (!obj || typeof obj !== 'object') return fallback;
    return obj[prop] !== undefined && obj[prop] !== null ? obj[prop] : fallback;
}

/**
 * Safely converts to number with fallback
 */
export function safeNumber(value: any, fallback: number = 0): number {
    if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
        return value;
    }
    if (typeof value === 'string') {
        const parsed = parseFloat(value);
        if (!isNaN(parsed) && isFinite(parsed)) {
            return parsed;
        }
    }
    return fallback;
}

/**
 * Safely formats a number to fixed decimal places
 */
export function safeToFixed(value: any, decimals: number = 2): string {
    return safeNumber(value).toFixed(decimals);
}

/**
 * Safely sets state in React
 */
export function safeSetState<T>(
    setter: (value: T) => void,
    value: any,
    fallback?: T
): void {
    try {
        setter(value !== undefined && value !== null ? value : (fallback as T));
    } catch (error) {
        console.error('safeSetState error:', error);
        if (fallback !== undefined) {
            setter(fallback);
        }
    }
}

/**
 * Safely adds two numbers
 */
export function safeAdd(a: any, b: any): number {
    return safeNumber(a) + safeNumber(b);
}

/**
 * Safely converts to string
 */
export function safeString(value: any, fallback: string = ''): string {
    if (value === null || value === undefined) return fallback;
    if (typeof value === 'string') return value;
    try {
        return String(value);
    } catch {
        return fallback;
    }
}

/**
 * Type assertion for literal string values (helps with TypeScript errors)
 */
export function asLiteral<T extends string>(value: string): T {
    return value as T;
}

/**
 * Check if a value is undefined or null
 */
export function isNullOrUndefined(value: any): boolean {
    return value === undefined || value === null;
}