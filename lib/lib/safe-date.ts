import { parseISO } from 'date-fns';

export function safeParseISO(dateString: string): Date | null {
  if (!dateString || typeof dateString !== 'string') {
    return null;
  }
  
  try {
    const parsed = parseISO(dateString);
    // تحقق مما إذا كان التاريخ صالحًا
    if (isNaN(parsed.getTime())) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.error('Error parsing date:', dateString, error);
    return null;
  }
}

export function formatSafeDistance(dateString: string, locale: any): string {
  const date = safeParseISO(dateString);
  if (!date) {
    return 'تاريخ غير صالح';
  }
  return formatDistanceToNow(date, { addSuffix: true, locale });
}
