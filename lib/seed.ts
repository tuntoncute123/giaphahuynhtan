import type { FamilyData, Member } from './types';
const base = { aliases: [], birthOrder: null, birthPlace: 'Quảng Nam', currentPlace: '', home: { address: '', latitude: null, longitude: null }, homePublic: false, zaloPhone: '', zaloConsent: false, anniversary: null, occupation: '', biography: '', deathDate: '', fatherId: null, motherId: null, spouseIds: [], avatar: '', createdAt: '2026-01-01T00:00:00.000Z' };
const m = (id: string, fullName: string, gender: Member['gender'], birthDate: string, extra: Partial<Member> = {}): Member => ({ ...base, id, fullName, gender, birthDate, ...extra });
// Dữ liệu minh họa, không phải hồ sơ có thật của dòng họ.
export const seedData: FamilyData = {
  updatedAt: '2026-01-01T00:00:00.000Z',
  content: [],
  shrines: [],
  reminders: [],
  reminderLogs: [],
  members: [
    m('ht-01','Huỳnh Tấn Công','Nam','1918-03-12',{ deathDate:'1998-08-20', spouseIds:['ht-02'], biography:'Nhân vật minh họa cho đời đầu tiên của cây gia phả.' }),
    m('ht-02','Nguyễn Thị An','Nữ','1922-06-05',{ deathDate:'2005-11-01', spouseIds:['ht-01'] }),
    m('ht-03','Huỳnh Tấn Phúc','Nam','1945-02-16',{ fatherId:'ht-01', motherId:'ht-02', spouseIds:['ht-05'], occupation:'Giáo viên' }),
    m('ht-04','Huỳnh Thị Lan','Nữ','1948-09-23',{ fatherId:'ht-01', motherId:'ht-02', spouseIds:['ht-06'] }),
    m('ht-05','Trần Thị Hương','Nữ','1947-12-08',{ spouseIds:['ht-03'] }),
    m('ht-06','Lê Văn Minh','Nam','1946-04-10',{ spouseIds:['ht-04'] }),
    m('ht-07','Huỳnh Tấn Bình','Nam','1972-07-17',{ fatherId:'ht-03', motherId:'ht-05', spouseIds:['ht-09'], occupation:'Kỹ sư' }),
    m('ht-08','Huỳnh Thị Mai','Nữ','1975-01-29',{ fatherId:'ht-03', motherId:'ht-05', occupation:'Giáo viên' }),
    m('ht-09','Phạm Thị Thu','Nữ','1974-05-13',{ spouseIds:['ht-07'] }),
    m('ht-10','Huỳnh Tấn Nam','Nam','2001-10-03',{ fatherId:'ht-07', motherId:'ht-09', occupation:'Sinh viên' }),
    m('ht-11','Huỳnh Ngọc Hà','Nữ','2004-08-15',{ fatherId:'ht-07', motherId:'ht-09', occupation:'Thiết kế' })
  ]
};
