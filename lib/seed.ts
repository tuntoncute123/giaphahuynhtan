import type { FamilyData } from './types';

// Dữ liệu ban đầu rỗng. Dữ liệu gia phả chính thức được lưu và đọc trực tiếp từ PostgreSQL trong database.
export const seedData: FamilyData = {
  updatedAt: new Date().toISOString(),
  members: [],
  shrines: [],
  reminders: [],
  reminderLogs: [],
  content: []
};
