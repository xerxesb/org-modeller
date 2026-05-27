import type { Discipline } from '../types';
import { newId } from '../utils/ids';

export const PRESET_DISCIPLINES: Discipline[] = [
  { id: newId('d'), name: 'Engineering', color: '#3B82F6' },
  { id: newId('d'), name: 'Eng Mgmt', color: '#1E40AF' },
  { id: newId('d'), name: 'Product', color: '#10B981' },
  { id: newId('d'), name: 'Design', color: '#F59E0B' },
  { id: newId('d'), name: 'Delivery', color: '#EF4444' },
  { id: newId('d'), name: 'Operations', color: '#6B7280' },
  { id: newId('d'), name: 'Data', color: '#8B5CF6' },
  { id: newId('d'), name: 'Leadership', color: '#EC4899' },
];
