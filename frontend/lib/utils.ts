// Nieuw bestand: frontend/lib/utils.ts
// Helper functies voor veilige number operations

/**
 * Veilige toFixed functie die undefined/null/NaN afhandelt
 */
export function safeToFixed(value: number | undefined | null, decimals: number = 2): string {
    if (value == null || !isFinite(value)) {
        return "0." + "0".repeat(decimals);
    }
    return value.toFixed(decimals);
}

/**
 * Veilige number parsing
 */
export function safeParseFloat(value: string | number | undefined | null): number {
    if (value == null) return 0;
    const parsed = typeof value === 'string' ? parseFloat(value) : value;
    return isFinite(parsed) ? parsed : 0;
}

/**
 * Veilige hours berekening uit time entries
 */
export function calculateHours(startTime: string, endTime: string, breakMinutes: number = 0): number {
    try {
        const start = new Date(startTime);
        const end = new Date(endTime);

        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return 0;
        }

        const diffMs = end.getTime() - start.getTime();
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        const totalMinutes = diffMinutes - (breakMinutes || 0);

        return totalMinutes > 0 ? totalMinutes / 60 : 0;
    } catch (error) {
        console.error('Error calculating hours:', error);
        return 0;
    }
}

/**
 * Veilige formattering van uren voor display
 */
export function formatHours(hours: number | undefined | null, decimals: number = 2): string {
    return safeToFixed(hours, decimals);
}

/**
 * Check of een waarde een geldig getal is
 */
export function isValidNumber(value: unknown): value is number {
    return typeof value === 'number' && isFinite(value);
}

/**
 * Veilige math operaties
 */
export const safeMath = {
    add: (a: number | undefined | null, b: number | undefined | null): number => {
        const safeA = safeParseFloat(a);
        const safeB = safeParseFloat(b);
        return safeA + safeB;
    },

    subtract: (a: number | undefined | null, b: number | undefined | null): number => {
        const safeA = safeParseFloat(a);
        const safeB = safeParseFloat(b);
        return safeA - safeB;
    },

    multiply: (a: number | undefined | null, b: number | undefined | null): number => {
        const safeA = safeParseFloat(a);
        const safeB = safeParseFloat(b);
        return safeA * safeB;
    },

    divide: (a: number | undefined | null, b: number | undefined | null): number => {
        const safeA = safeParseFloat(a);
        const safeB = safeParseFloat(b);
        return safeB !== 0 ? safeA / safeB : 0;
    }
};