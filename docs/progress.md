# Tiến độ

## Đã hoàn thành

- Bootstrap npm/pnpm-compatible monorepo.
- Next.js dashboard shell tiếng Việt.
- Fastify API, Swagger, CORS, rate limit, secret redaction.
- Prisma schema nền tảng và seed demo.
- Webhook schema, event log, Page routing, stale/echo/excluded-tag filtering.
- Dedupe request/message bằng unique constraints.
- Lưu conversation/message và unit tests cho parser, tags, splitter, phone.
- pg-boss debounce queue với singleton key theo conversation.
- PostgreSQL advisory transaction lock chống hai worker xử lý cùng conversation.
- Agent provider abstraction và OpenAI-compatible adapter cho OpenAI/DeepSeek.
- Structured action parser và compatibility parser cho marker cũ.
- AES-256-GCM encryption/decryption cho Page token.
- Pancake client với timeout, exponential retry cho 429/5xx và không retry lỗi 4xx.
- Worker gom pending messages, lưu AI execution, actions và outbound chunks.
- Delayed outbound delivery qua queue.
- Nạp `.env` đúng từ root cho API và Prisma workspace scripts.
- Auth API bằng signed, httpOnly, sameSite cookie và bcrypt.
- Dashboard summary API dùng dữ liệu PostgreSQL.
- Page CRUD/settings API và endpoint lưu encrypted Page token.
- Product CRUD API; conversation timeline/mode API; webhook/AI/outbound log APIs.
- WebUI hoạt động cho login, dashboard, Pages, products, conversations và logs.
- Agent loop gọi tool sản phẩm, lịch sử khách hàng và trạng thái đơn hàng.
- ToolExecution được lưu với input/output/success/latency.
- AI Playground chạy thật, hiển thị answer, actions, tool calls và latency.
- Action executor gắn tag và gửi nhóm ảnh thuộc đúng Page.
- API CRUD nhóm ảnh và URL asset.

## Tiếp theo

- Anthropic native provider.
- Bảo vệ toàn bộ admin routes bằng auth middleware và CSRF token.
- Page Settings đầy đủ (prompt, rules, token masked, test connection, sync tags).
- Chỉnh sửa/xóa sản phẩm và upload asset trong UI.
- Integration tests thật với PostgreSQL test container.
