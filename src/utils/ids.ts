import { nanoid } from 'nanoid';

export function newId(prefix = 'p'): string {
  return `${prefix}_${nanoid(6)}`;
}
