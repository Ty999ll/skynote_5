import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow, parseISO } from 'date-fns'; 
import { enUS } from 'date-fns/locale';
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPostDate(isoTimestamp: string): string {
   const postDate = parseISO(isoTimestamp); 
  return formatDistanceToNow(postDate, { addSuffix: true, locale: enUS });
}