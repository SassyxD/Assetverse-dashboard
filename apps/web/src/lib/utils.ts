import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** shadcn convention — clsx + tailwind-merge กัน class ชนกันเองเวลา override */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
