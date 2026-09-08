# Assetverse — Engineering Monitoring Dashboard

มอนิเตอร์ pipeline เก็บข้อมูลอสังหาริมทรัพย์จาก 17 เว็บ marketplace/ธนาคารในไทย
ดูอย่างเดียว ไม่มีปุ่มสั่งงาน

## รัน

```bash
corepack enable pnpm          # หรือ npm i -g pnpm@12
pnpm install
pnpm dev
```

`pnpm dev` เปิดพร้อมกันหมด · web ที่ `:3000` · gateway `:4100` · service ย่อย `:4101-4105`

```bash
pnpm typecheck    # ตรวจ type ทุก package
pnpm build        # build ทุกอย่าง
```

## หน้าเว็บ

| route | ตอบคำถามอะไร |
|---|---|
| `/` | ภาพรวม 17 เว็บ เรียงตาม severity · รอบนี้ไปถึงไหน ใครต้องแก้ ดูเว็บไหนก่อน |
| `/sites/[site]` | สายงาน S1-S8 ของเว็บนั้น · queue / fetcher / extractor / LLM recovery |
| `/sites/[site]/quality` | coverage matrix · fill rate ต่อ field · ค่าที่หลุดช่วง |
| `/infra` | 3 สาเหตุที่เข้าเว็บไม่ได้ · เส้นทาง H1-H9 · S3 / Aurora / Fargate |

UI เป็น shadcn (Tailwind 4 + token ใน `globals.css`) component อยู่ที่
`apps/web/src/components/ui` เพิ่มตัวใหม่ด้วย `npx shadcn@latest add <name>` ได้เลย
เพราะมี `components.json` ตั้งไว้แล้ว

ชั้นที่ห้ามข้ามคือ `components/measure.tsx` · ทุกตัวเลขที่เป็น `Measurement`
ต้องผ่าน `Field` / `Cell` ที่นั่น เพื่อให้ "ยังไม่วัด" กับ "วัดแล้วได้ศูนย์"
ไม่มีทางแสดงเหมือนกัน (ช่องที่ยังไม่วัดเป็นลายทแยง)

## deploy

frontend รู้จัก `/api/*` ทางเดียว ของจริงอยู่ที่ไหนเป็นเรื่องของ config

| สภาพแวดล้อม | `/api/*` ไปไหน |
|---|---|
| dev บนเครื่อง | proxy ไป gateway `:4100` (`beforeFiles` rewrite) |
| Vercel | route handler ใน `apps/web/src/app/api` อ่าน fixtures ตรง |
| มี gateway จริงบนคลาวด์ | ตั้ง `GATEWAY_URL` แล้ว proxy กลับไปเหมือน dev |

route handler มีไว้ให้ deploy ตัวเดียวจบตอนยังเป็น mock · โครง response
ต้องเท่ากับ `services/gateway` เสมอ แก้ที่หนึ่งต้องแก้อีกที่

ตั้งค่าบน Vercel: root directory `apps/web` · build `cd ../.. && pnpm turbo run build --filter=@assetverse/web`

## เวอร์ชัน

เช็คจาก npm registry วันที่ 7 ก.ย. 2026 ไม่ได้เดา

| | |
|---|---|
| Node | 22+ · pnpm 12.3.4 |
| Next.js | 16.3.4 · React 19.2.8 |
| TanStack Query | 5.102.8 |
| Tailwind | 4.3.3 (config อยู่ใน CSS ไม่มี `tailwind.config.js`) |
| TypeScript | 7.0.2 (native compiler — ต้องโหลด platform binary) |
| Hono | 4.13.7 · zod 4.5.4 · Turborepo 2.10.12 |

## โครง monorepo

```
packages/
  contracts/      zod schema + type ที่ทุกฝั่งใช้ร่วมกัน — แหล่งความจริงเดียว
  fixtures/       ข้อมูล mock (ตัวเลขจริงจาก data/ ของ crawler)
  service-kit/    Hono app factory — /healthz + รูปแบบ error เหมือนกันทุก service

services/
  gateway/                :4100  BFF — frontend เรียกที่นี่ที่เดียว
  queue-service/          :4101  SQS frontier / parsing / DLQ
  crawler-service/        :4102  fetcher, coverage, runs
  extractor-service/      :4103  KBMF, range check, LLM recovery
  infra-service/          :4104  S3 / Aurora / Fargate / เส้นทางเน็ตเวิร์ก
  integrations-service/   :4105  change detection / PII / 2captcha (ทีมอื่นทำ)

apps/
  web/                    :3000  Next.js App Router + TanStack Query
```

**gateway เป็นตัวเดียวที่ frontend รู้จัก** — `next.config.ts` proxy `/api/*` ไปที่มัน
เลยไม่มีเรื่อง CORS และเพิ่ม/ย้าย service ย่อยได้โดย frontend ไม่ต้องแก้

ตอนนี้ gateway อ่านจาก fixtures ตรงๆ · ตั้ง `USE_SERVICES=1` เพื่อสลับไปรวมจาก
service ย่อยจริง **โครง response เหมือนกันทั้งสองโหมด** และถ้า service ตัวใดล่ม
gateway จะคง fallback ไว้ ไม่ทำให้ทั้งหน้าว่าง

## 3 อย่างที่ encode ไว้ใน type ให้ลืมไม่ได้

### 1 · `Measurement<T>` — "ยังไม่รู้" ต่างจาก "วัดแล้วได้ศูนย์"

```ts
type Measurement<T> = {
  state: 'ok' | 'insufficient' | 'unavailable';
  value: T | null;          // null เมื่อ unavailable — ห้ามใส่ 0 แทน
  sampleSize?: number;
  note?: string;            // เหตุผล โชว์ให้คนอ่านตรงๆ
};
```

`unavailable` → UI แสดง `—` · `insufficient` → ติดธง "ยันไม่ได้"
(scb มี 20 แถวจาก 4,031 — fill rate 96.4% ที่คำนวณจาก 20 แถวไม่ควรแสดงเทียบเท่า
96.5% ที่มาจาก 57,571 แถว)

ทุกที่ที่แสดงตัวเลขต้องผ่าน `showNum` / `showPct` ใน `lib/format.ts` ซึ่งรับ
`Measurement` เท่านั้น — ใส่ `number` ดิบเข้าไปไม่ได้

### 2 · `SourceStatus` → `Owner` — "เข้าเว็บไม่ได้" มี 3 สาเหตุคนละคนแก้

| status | ใครแก้ | สี |
|---|---|---|
| `source_down` | **ไม่มีใครแก้ได้ ต้องรอ** | เหลือง ไม่ใช่แดง |
| `throttled` (403/429) | ทีมเรา — ลด rate | แดง |
| `network_path_down` | ทีม infra | แดง |
| `failed` | ทีมเรา | แดง |

`ownerOf(status)` แปลงให้ UI ไม่ต้องเดา · **`source_down` ห้ามเป็นแดง** เพราะเป็น
สถานะปกติที่ไม่ต้องทำอะไร ถ้าแดงคนจะชินแล้วเลิกสนใจตอนมีเรื่องจริง
(ทีมเขียน painpoint นี้ไว้เองในไดอะแกรมว่า "Cannot reach the Thai websites")

### 3 · `FieldGap` — ว่างทุกแถว ≠ ว่างบางแถว

`structural` = ต้นทางไม่ส่ง field มาเลย แก้ที่สเปก crawl ซ้ำไม่ช่วย
`sparse` = ผู้ประกาศไม่กรอกบางราย crawl ซ้ำก็ไม่เพิ่ม

**นี่คือเหตุที่ `fill rate 86.9%` ผ่านเกณฑ์ แต่ `record complete 0%`** — field `year`
ว่างทุกแถว ทุกแถวจึงขาดอย่างน้อย 1 ช่อง แม้ช่องอื่นเต็มหมด UI วางสองเลขนี้คู่กัน
พร้อมคำอธิบาย ไม่ให้อ่านเป็นความขัดแย้ง

## ที่ออกแบบให้แก้ปัญหาที่เจอจริง

- **coverage matrix ทำช่องว่างให้เด่นกว่าช่องที่มีเลขเยอะ** (ลายส้ม) — 57,571 แถว
  ดูเยอะ แต่กระจุกใน 1 ใน 8 ช่อง และยอดรวมไม่บอกเรื่องนี้
- **จังหวัดที่มีไม่ถึง 10 แถวถือเป็นช่องว่าง** ไม่ใช่ "มีข้อมูล" (ชลบุรี 5 · เชียงใหม่ 4
  · นครนายก 1)
- **panel ค่าที่มีแต่น่าสงสัย** แยกจากการวัดว่า field ว่างหรือไม่ — เคยคำนวณเนื้อที่ดิน
  เพี้ยน 501 เท่า ได้ 16,157 ไร่ ต่อบ้านหลังเดียว โดยไม่มีอะไรเตือน เพราะช่องนั้น "มีค่า"
- **DLQ อยู่ตำแหน่งเด่น + เหตุผลที่เข้า DLQ** เพราะทั้ง 2 painpoint (crawler ตาย /
  html เปลี่ยน) โผล่ที่ DLQ ก่อน completeness ตก ซึ่งวัดตอนจบรอบเดือน
- **แกนเวลาเป็นรอบเดือน** (รัน 1 · อัป script 5/10 · retry 12) ไม่ใช่ 24 ชม.ล่าสุด
  `staleTime` ของ TanStack Query จึงตั้ง 60 วิ ไม่ต้อง refetch ถี่
- **`severity` คิดที่ backend** — หน้าภาพรวมเรียงตามความรุนแรง ไม่ใช่ตามตัวอักษร
  UI ไม่ต้องเดาลำดับ

## metric ที่ยังไม่มีข้อมูลรองรับ

7 ตัวจากสเปก MonitorFields ของทีม — โค้ดมี field ไว้แล้วแต่ค่าเป็น `unavailable`
พร้อม `note` บอกเหตุผล **ไม่ได้โชว์ 0 หลอก**

| field | เหตุผล |
|---|---|
| `avg_queue_wait_time` | ยังไม่ stamp เวลาตอน enqueue |
| `queue_depth_extractor` · `total_extractor_time` | สเปกคิดว่ามี stage Crawler/Extractor แยกกัน มีคิวคนละอัน แต่ crawler จริงรวมเป็นขั้นเดียว คิวเดียว |
| `no_deleted_queue` | สเปกไม่มีคำอธิบาย ต้องถามเจ้าของสเปก |
| `2captcha_Count` | ยังไม่มีระบบ solve captcha — ที่เจอคือ HTTP 523 (origin ล่ม) คนละเรื่อง |
| `no_delisted_URLs` | ยังไม่เก็บ snapshot ย้อนหลัง |
| `%storage_availibility` | ยังไม่ได้นิยาม total storage size |
| Aurora ทุกตัว | ยังไม่ได้ต่อ Aurora — crawler เขียนลงดิสก์ |

## ต่อของจริงตอนไหน

`packages/fixtures` เป็น repository layer — เปลี่ยนเป็นอ่านจาก S3/Aurora/CloudWatch
โดยที่ `packages/contracts` และ frontend ไม่ต้องแก้ ถ้ารูป response ยังตรง schema

จุดที่ต้องแก้: `services/*/src/index.ts` เปลี่ยนจาก `snapshots()` เป็น query จริง
