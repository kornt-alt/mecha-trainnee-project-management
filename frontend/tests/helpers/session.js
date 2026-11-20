// frontend/tests/helpers/session.js — ตั้งสถานะ "เข้าสู่ระบบแล้ว" ก่อนเปิดหน้า (ไม่ต้องผ่านหน้าต่าง login ทุกเทส)
//
// ⚠️ key / shape ต้องตรงกับ frontend/src/utils/session.js (KEY = 'mecha.session', { employeeId })
// addInitScript รันก่อนสคริปต์ของหน้าในทุกการโหลด — เทสที่ต้องการเห็นหน้าต่าง login (login.spec.js) ห้ามเรียกตัวนี้
export async function loginAs(page, employeeId = 'emp-001') {
  await page.addInitScript((id) => {
    window.sessionStorage.setItem('mecha.session', JSON.stringify({ employeeId: id }));
  }, employeeId);
}
