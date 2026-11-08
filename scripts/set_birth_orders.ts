import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { saveFamily } from '../lib/store';
import type { FamilyData } from '../lib/types';

const SIBLING_GROUPS: Record<string, string[]> = {
  // 1. Huỳnh Tấn Lộc
  'ht-loc': ['ht-loc-c1', 'ht-hien'],
  // 2. Huỳnh Tấn Hiền
  'ht-hien': [
    'ht-truong', 'ht-tho', 'ht-tu', 'ht-lien',
    'ht-doi', 'ht-hoa', 'ht-do', 'ht-nghi', 'ht-toan'
  ],
  // 3. Huỳnh Tấn Tu (13 con: A, Địch, Niên, Nghệ, Cho, Bộc, Dị, Đống, B, C, Năng, Bốn, Lý)
  'ht-tu': [
    'ht-cu', 'ht-dich', 'ht-nien', 'ht-nghe', 'ht-cho', 'ht-boc',
    'ht-di', 'ht-dong', 'ht-tung', 'ht-doan', 'ht-nang', 'ht-bon', 'ht-ly'
  ],
  // 4. Huỳnh Tấn Cự (Nhánh A)
  'ht-cu': ['ht-a1-nghi', 'ht-a2-chu', 'ht-a3-ry'],
  // 5. Huỳnh Tấn Chừ
  'ht-a2-chu': [
    'ht-a2-bien', 'ht-a2-cuoc', 'ht-a2-vung', 'ht-a2-ky',
    'ht-a2-thiet', 'ht-a2-tra', 'ht-a2-ka', 'ht-a2-quyen'
  ],
  // 6. Huỳnh Tấn Ka (Cảnh)
  'ht-a2-ka': [
    'ht-a2-anh', 'ht-a2-ba', 'ht-a2-lan', 'ht-a2-mylinh', 'ht-a2-thuylinh'
  ],
  // 7. Huỳnh Tấn Lan
  'ht-a2-lan': ['ht-a2-phuong', 'ht-a2-dien', 'ht-a2-toan'],
  // 8. Huỳnh Tấn Phương
  'ht-a2-phuong': ['ht-a2-thao', 'ht-a2-khoa'],
  // 9. Huỳnh Tấn Diện
  'ht-a2-dien': ['ht-a2-thien', 'ht-a2-tai'],
  // 10. Huỳnh Tấn Toàn
  'ht-a2-toan': ['ht-a2-baokhang', 'ht-a2-sory'],
  // 11. Huỳnh Tấn Ry
  'ht-a3-ry': [
    'ht-a3-khoan', 'ht-a3-boc', 'ht-a3-chanh', 'ht-a3-khiet',
    'ht-a3-lanh', 'ht-a3-di', 'ht-a3-tri', 'ht-a3-beo'
  ],
  // 12. Huỳnh Tấn Tri
  'ht-a3-tri': ['ht-a3-phan', 'ht-a3-khoi'],
  // 13. Huỳnh Tấn Tũng (Nhánh B)
  'ht-tung': [
    'ht-b1-phang', 'ht-b2-xang', 'ht-b3-han',
    'ht-b4-le', 'ht-b5-luu', 'ht-b6-lam'
  ],
  // 14. Huỳnh Tấn Xáng
  'ht-b2-xang': ['ht-b2-ban', 'ht-b2-bien', 'ht-b2-kien', 'ht-b2-rien'],
  // 15. Huỳnh Tấn Biện
  'ht-b2-bien': ['ht-b2-thuy', 'ht-b2-dung', 'ht-b2-huu', 'ht-b2-chi', 'ht-b2-thuy2'],
  // 16. Huỳnh Tấn Dũng (nhánh B)
  'ht-b2-dung': ['ht-b2-sy', 'ht-b2-binhyen', 'ht-b2-lina'],
  // 17. Huỳnh Tấn Hữu
  'ht-b2-huu': ['ht-b2-nghia', 'ht-b2-baoquyen'],
  // 18. Huỳnh Tấn Hạn
  'ht-b3-han': ['ht-b3-hanh', 'ht-b3-vodanh', 'ht-b3-phuc'],
  // 19. Huỳnh Tấn Đoan (Nhánh C)
  'ht-doan': [
    'ht-c1-phang', 'ht-c2-chau', 'ht-c3-sa', 'ht-c4-sam',
    'ht-c5-nhung', 'ht-c6-phung', 'ht-c7-tung', 'ht-c8-thin',
    'ht-c9-thuc', 'ht-c10-tang', 'ht-c11-bo'
  ],
  // 20. Huỳnh Tấn Sa
  'ht-c3-sa': [
    'ht-c3-kha', 'ht-c3-kha2', 'ht-c3-dan', 'ht-c3-ve',
    'ht-c3-sinh', 'ht-c3-duong', 'ht-c3-dao'
  ],
  // 21. Huỳnh Tấn Kha
  'ht-c3-kha': ['ht-c3-xuanhuong', 'ht-c3-xuanhuyen', 'ht-c3-xuanhuyen2'],
  // 22. Huỳnh Tấn Dân
  'ht-c3-dan': ['ht-c3-son', 'ht-c3-phuong', 'ht-c3-thuthao'],
  // 23. Huỳnh Tấn Sơn
  'ht-c3-son': ['ht-c3-nhuquynh', 'ht-c3-kien'],
  // 24. Huỳnh Tấn Dưỡng
  'ht-c3-duong': ['ht-c3-thanh', 'ht-c3-tam', 'ht-c3-kimdiep'],
  // 25. Huỳnh Tấn Thành
  'ht-c3-thanh': ['ht-c3-yenlinh', 'ht-c3-linhchi', 'ht-c3-nhungoc'],
  // 26. Huỳnh Tấn Tâm
  'ht-c3-tam': ['ht-c3-nam', 'ht-c3-giahuy'],
  // 27. Huỳnh Tấn Nhung
  'ht-c5-nhung': [
    'ht-c5-than', 'ht-c5-dan', 'ht-c5-tu', 'ht-c5-tu2',
    'ht-c5-kimdung', 'ht-c5-tam6', 'ht-c5-chin', 'ht-c5-kimhoa', 'ht-c5-thuan'
  ],
  // 28. Huỳnh Tấn Thận
  'ht-c5-than': ['ht-c5-dung', 'ht-c5-tan'],
  // 29. Huỳnh Tấn Dũng (nhánh C)
  'ht-c5-dung': ['ht-c5-kieunga', 'ht-c5-kieungan', 'ht-c5-nhat'],
  // 30. Huỳnh Tấn Tân
  'ht-c5-tan': ['ht-c5-toan', 'ht-c5-phat'],
  // 31. Huỳnh Tấn Dần
  'ht-c5-dan': ['ht-c5-hai', 'ht-c5-thuha', 'ht-c5-hien', 'ht-c5-hathu', 'ht-c5-thanh'],
  // 32. Huỳnh Tấn Hải
  'ht-c5-hai': ['ht-c5-tai'],
  // 33. Huỳnh Tấn Thanh
  'ht-c5-thanh': ['ht-c5-thuyquynh', 'ht-c5-annhien'],
  // 34. Huỳnh Tấn Thuận
  'ht-c5-thuan': ['ht-c5-bichtram', 'ht-c5-dat', 'ht-c5-thanhtruc']
};

async function run() {
  const file = path.join(process.cwd(), 'data', 'family.json');
  const data: FamilyData = JSON.parse(readFileSync(file, 'utf8'));

  const idMap = new Map(data.members.map(m => [m.id, m]));
  let assignedCount = 0;

  for (const [parentId, childrenIds] of Object.entries(SIBLING_GROUPS)) {
    childrenIds.forEach((childId, index) => {
      const child = idMap.get(childId);
      if (child) {
        child.birthOrder = index + 1; // 1 = anh/chị cả, 2 = thứ hai, 3 = thứ ba...
        assignedCount++;
      } else {
        console.warn(`Child ID ${childId} not found in members!`);
      }
    });
  }

  console.log(`Assigned birthOrder to ${assignedCount} of ${data.members.length} members.`);

  // Write updated JSON to data/family.json
  writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  console.log('Saved to data/family.json');

  // Also save to database if DATABASE_URL is set
  if (process.env.DATABASE_URL) {
    await saveFamily(data);
    console.log('Successfully saved to Postgres database via saveFamily()!');
  } else {
    console.log('DATABASE_URL not set in local env, will run with DATABASE_URL.');
  }

  process.exit(0);
}

run().catch(err => {
  console.error('Error running set_birth_orders:', err);
  process.exit(1);
});
