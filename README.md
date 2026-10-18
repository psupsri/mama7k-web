# 7K Re Community — Web client

React + TypeScript + Vite. ตอนนี้ยังไม่ต่อ API ข้อมูลทั้งหมดมาจาก mock ที่เก็บใน localStorage ของเบราว์เซอร์

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # business-rule tests of the mock API (FR sections)
npm run build
```

## Mock users

ปุ่ม **Mock** มุมล่างซ้ายใช้สลับผู้ใช้และรีเซ็ตข้อมูล หรือจะเข้าสู่ระบบด้วยอีเมลด้านล่างกับรหัสผ่านอะไรก็ได้

| ผู้ใช้ | อีเมล | Role | Group |
| --- | --- | --- | --- |
| Pisit | pisit@example.com | SUPER_ADMIN | Owner กิลด์มาม่า, สมาชิก Night Raid |
| หมีน้อย | mee@example.com | USER | สมาชิก กิลด์มาม่า |
| ShadowBlade | shadow@example.com | MODERATOR | Owner Night Raid |
| สายฟ้า | fah@example.com | USER | Owner ห้องลับสายฟ้า |
| โดนแบน | banned@example.com | USER (ถูกระงับ) | — |

Invite code ตัวอย่าง: `MAMA7K`, `NIGHT01`, `FAHFAH`

## Structure

```
src/
  api/         mock API: business rules the Go API will own (access, duplicates, votes, groups, admin)
  mock/        seed data + in-memory DB persisted to localStorage
  types/       domain types shared with the future API contract
  hooks/       React Query hooks and toast hook
  components/  UI building blocks (Formation, ImageSlot, BuildCard, VotePanel, ...)
  pages/       routes; pages/admin = Admin + Master Data
```

UI เรียกเฉพาะฟังก์ชันใน `src/api/*` ตอนต่อ Go API ให้เปลี่ยน implementation ในโฟลเดอร์นี้เป็น HTTP call แล้วลบ `src/mock/`, `api/internal.ts` และ Mock panel ใน `components/Layout.tsx`
