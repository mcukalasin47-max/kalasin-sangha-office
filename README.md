# ระบบทำเนียบพระสงฆ์ อำเภอคำม่วง

ระบบกลางสำหรับสำนักงานเจ้าคณะอำเภอคำม่วง จังหวัดกาฬสินธุ์

## สถาปัตยกรรม

- **Vercel** — ประตูเข้าสู่ระบบและ URL สาธารณะ
- **Google Apps Script** — แบบฟอร์ม ทำเนียบ หลังบ้าน และ Business Logic
- **Google Sheets** — ฐานข้อมูล
- **Google Drive** — รูปภาพ เอกสารส่งออก และไฟล์สำรอง
- **GitHub** — Source of Truth สำหรับซอร์สโค้ด

## โครงสร้าง

```text
apps-script/       ซอร์สสำหรับ Google Apps Script
api/config.js      อ่าน APPS_SCRIPT_URL จาก Vercel Environment Variable
public/            โลโก้และ favicon
index.html         Portal หลัก
app.js             ตรวจการเชื่อมต่อและนำทาง
styles.css         Design system
vercel.json        Routes และ Security headers
```

## เชื่อม Vercel กับ Apps Script

ตั้ง Environment Variable ชื่อ `APPS_SCRIPT_URL` เป็น URL Web App ที่ลงท้ายด้วย `/exec` แล้ว Redeploy

```text
APPS_SCRIPT_URL=https://script.google.com/macros/s/DEPLOYMENT_ID/exec
```

เส้นทางบน Vercel:

- `/form` → `?page=form`
- `/directory` → `?page=directory`
- `/admin` → `?page=admin`

## ติดตั้ง Apps Script

1. สร้างหรือเปิด Google Apps Script Project
2. คัดลอกไฟล์ใน `apps-script/`
3. ตั้ง Script Properties ตามรายการใน `apps-script/Setup.gs`
4. รัน `installExistingSystem()`
5. Deploy เป็น Web App: Execute as Me / Anyone
6. นำ URL `/exec` ไปตั้งเป็น `APPS_SCRIPT_URL` ใน Vercel

## ความปลอดภัย

Repository นี้ไม่เก็บ Spreadsheet ID, Folder ID, รหัสผ่านผู้ดูแล หรือค่า Secret จริง ให้เก็บข้อมูลเหล่านั้นใน Apps Script Properties และ Vercel Environment Variables เท่านั้น

## ผู้พัฒนา

พระมหาธงชัย วิลาสินี
