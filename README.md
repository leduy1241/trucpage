# AI Page Operator

Tool AI trực Page đa thương hiệu, nhận webhook Pancake, gom tin nhắn và chuẩn bị nền tảng cho AI tool calling.

## Yêu cầu

- Node.js 20 LTS được khuyến nghị (Node 18 vẫn chạy bộ test hiện tại)
- npm 9+ hoặc pnpm 9+
- PostgreSQL 16 (có thể chạy bằng Docker)

## Chạy local

```bash
cp .env.example .env
npm install
docker compose up -d
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Nếu Prisma báo timeout advisory lock sau khi một lệnh migration bị đóng giữa chừng, restart riêng PostgreSQL rồi chạy lại:

```bash
docker compose restart postgres
npm run db:migrate
npm run db:seed
```

WebUI: `http://localhost:3000`; API: `http://localhost:4000`; Swagger: `http://localhost:4000/docs`.

Tài khoản seed development: `admin@example.com` / `admin123`. Không dùng credential này ở production.

## Webhook

Đăng ký `POST http://<api-host>:4000/webhooks/pancake`. Payload hiện được chuẩn hóa theo schema tại `apps/api/src/modules/webhook/schema.ts`; adapter có thể được điều chỉnh theo payload thật của tài khoản Pancake.

Webhook trả HTTP 200 sau khi ghi DB và schedule job. AI/Pancake được xử lý ngoài request bởi pg-boss. OpenAI cần `OPENAI_API_KEY`; DeepSeek cần `DEEPSEEK_API_KEY`.

## Bảo mật

Không commit `.env`. Token Page sẽ lưu mã hóa trong `PageSecret`; API không được trả raw token. Logger đã redact các header/token phổ biến.
