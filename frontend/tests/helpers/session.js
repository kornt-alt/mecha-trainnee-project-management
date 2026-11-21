// frontend/tests/helpers/session.js — ตั้งสถานะ "เข้าสู่ระบบแล้ว" ก่อนเปิดหน้า (ไม่ต้องผ่านหน้าต่าง login ทุกเทส)
//
// ⚠️ key / shape ต้องตรงกับ frontend/src/utils/session.js (KEY = 'mecha.session', { employeeId })
// addInitScript รันก่อนสคริปต์ของหน้าในทุกการโหลด — เทสที่ต้องการเห็นหน้าต่าง login (login.spec.js) ห้ามเรียกตัวนี้
export async function loginAs(page, employeeId = 'emp-001') {
  await page.addInitScript((id) => {
    window.sessionStorage.setItem('mecha.session', JSON.stringify({ employeeId: id }));
  }, employeeId);
}

// เปลี่ยนผู้ใช้กลางเทส — ทางเดียวกับผู้ใช้จริง: เมนูผู้ใช้ → ออกจากระบบ → login คนใหม่ (หน้าต่าง login เด้งทับหน้าเดิม)
// ข้อมูล mock ไม่หายเพราะไม่รีโหลดหน้า · เดิมใช้ตัวเลือก "ดูในฐานะ" ในหัวโปรเจกต์ ซึ่งลบไปแล้ว
export async function switchUser(page, employeeId) {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const toggle = page.locator('.app-menu-toggle');
  if (await toggle.isVisible()) {
    if ((await toggle.getAttribute('aria-expanded')) !== 'true') await toggle.click();
  }
  await page.locator('.sidebar-profile-btn').click();
  await page.getByRole('button', { name: /ออกจากระบบ|เข้าสู่ระบบ/ }).click();
  const dialog = page.getByRole('dialog', { name: 'เข้าสู่ระบบ' });
  await dialog.getByLabel('รหัสพนักงาน').fill(employeeId);
  await dialog.getByLabel('รหัสผ่าน', { exact: true }).fill('demo');
  await dialog.getByRole('button', { name: 'เข้าสู่ระบบ', exact: true }).click();
  await dialog.waitFor({ state: 'detached', timeout: 20000 });
}
