# CLAUDE.md — AI Page Operator

## 0. Mục tiêu của project

Hãy xây dựng một **tool AI trực Page hoàn chỉnh có WebUI**, thay thế workflow n8n hiện tại.

Ứng dụng phải:
- Nhận webhook tin nhắn/comment từ Pancake/Pages.fm.
- Router theo từng Page.
- Lọc các conversation không được phép để AI trả lời.
- Gom các tin khách gửi liên tiếp trong một khoảng debounce trước khi gọi AI.
- Đọc lịch sử hội thoại gần nhất.
- Dùng AI Agent có tool calling để:
  - tra cứu thông tin sản phẩm,
  - tra cứu lịch sử khách hàng,
  - kiểm tra trạng thái đơn hàng.
- Trả lời inbox tự động.
- Xử lý comment: reply comment + private reply.
- Tự gắn tag khi khách đủ điều kiện chốt đơn.
- Tự gửi ảnh sản phẩm khi AI phát hiện khách muốn xem ảnh.
- Tách câu trả lời dài thành nhiều message nhỏ và gửi lần lượt.
- Có WebUI để quản trị Page, AI, prompt, sản phẩm, tags, hội thoại, logs và test AI.
- Thiết kế multi-page/multi-brand từ đầu, không hard-code Liproin.

Đây là một **sản phẩm độc lập**, không phụ thuộc vào n8n khi chạy production.

---

# 1. Nguyên tắc bắt buộc khi Claude Code làm project

1. Không chỉ viết plan. Phải **tạo code chạy được**.
2. Luôn ưu tiên MVP chạy end-to-end trước, sau đó mới polish UI.
3. Không hard-code secret/token/API key vào source.
4. Không copy token thật từ workflow JSON cũ vào project.
5. Mọi biến bí mật dùng `.env`.
6. Mọi webhook event phải có log.
7. Mọi outbound request tới Pancake phải có retry hợp lý và log lỗi.
8. Mọi message phải chống xử lý trùng bằng `message_id`.
9. Mọi job AI phải chống race condition.
10. Tất cả cấu hình đặc thù Page phải lưu DB, không hard-code trong logic.
11. UI phải dùng tiếng Việt.
12. Code, biến, type, DB field có thể dùng tiếng Anh.
13. Tạo README đủ để một người không rành code vẫn chạy project bằng VS Code.
14. Không thêm microservice thừa. Giữ kiến trúc đơn giản nhưng production-ready.

---

# 2. Stack kỹ thuật

Sử dụng stack sau trừ khi có lý do kỹ thuật rất mạnh để thay đổi.

## Monorepo
- pnpm workspace
- TypeScript

## WebUI
- Next.js App Router
- React
- Tailwind CSS
- shadcn/ui
- TanStack Query
- React Hook Form + Zod
- Recharts cho dashboard

## Backend API
- Fastify
- TypeScript
- Zod validation
- OpenAPI/Swagger

## Database
- PostgreSQL
- Prisma ORM

## Background jobs / debounce
- `pg-boss` dùng PostgreSQL làm queue.
- Không bắt buộc Redis cho MVP.

## AI
Tạo provider abstraction hỗ trợ tối thiểu:
- DeepSeek
- OpenAI
- Anthropic

AI provider phải cấu hình theo Page.

Tool calling phải được triển khai qua interface nội bộ, không phụ thuộc trực tiếp vào n8n LangChain nodes.

## Auth
MVP:
- email/password admin login
- session bằng secure httpOnly cookie
- bcrypt/argon2 password hashing

Không cần social login.

---

# 3. Cấu trúc repo đề xuất

```text
ai-page-operator/
├─ apps/
│  ├─ web/
│  │  ├─ app/
│  │  ├─ components/
│  │  ├─ lib/
│  │  └─ ...
│  └─ api/
│     ├─ src/
│     │  ├─ app.ts
│     │  ├─ server.ts
│     │  ├─ config/
│     │  ├─ modules/
│     │  │  ├─ auth/
│     │  │  ├─ pages/
│     │  │  ├─ pancake/
│     │  │  ├─ webhook/
│     │  │  ├─ conversations/
│     │  │  ├─ messages/
│     │  │  ├─ ai/
│     │  │  ├─ products/
│     │  │  ├─ customers/
│     │  │  ├─ orders/
│     │  │  ├─ tags/
│     │  │  ├─ jobs/
│     │  │  └─ logs/
│     │  └─ workers/
│     └─ ...
├─ packages/
│  ├─ db/
│  │  ├─ prisma/
│  │  │  └─ schema.prisma
│  │  └─ src/
│  ├─ shared/
│  └─ ai-core/
├─ docker-compose.yml
├─ .env.example
├─ README.md
├─ CLAUDE.md
└─ pnpm-workspace.yaml
```

---

# 4. Kiến trúc nghiệp vụ cần giữ từ workflow cũ

## 4.1 Router cấp Page

Webhook mới đi vào:

```text
Pancake webhook
  -> validate payload
  -> ignore event quá cũ
  -> lookup page_id
  -> lookup cấu hình Page
  -> kiểm tra conversation/tag/exclusion
  -> route Inbox hoặc Comment
```

Mỗi Page có cấu hình riêng:
- `page_id`
- tên Page
- active/inactive
- Pancake page access token
- global Pancake access token nếu cần
- AI model/provider
- system prompt
- debounce seconds
- response chunk count
- response delay seconds
- context window
- excluded tag IDs
- tag khi AI chốt đơn
- product image assets
- reply comment template
- auto reply inbox on/off
- auto private reply comment on/off

Không tạo một workflow riêng cho từng Page như n8n.

---

# 5. Quy tắc webhook

Endpoint:

```http
POST /webhooks/pancake
```

Payload cần lưu `raw_payload` để debug.

Tạo bảng `webhook_events`.

Yêu cầu:
- idempotency theo `request_id` nếu có.
- message idempotency theo `data.message.id`.
- bỏ event cũ quá 5 phút.
- bỏ tin do chính Page gửi.
- bỏ tin do bot Public API gửi nếu event quay lại webhook.
- nếu Page inactive thì chỉ log, không xử lý.
- nếu conversation có tag thuộc `excluded_tag_ids` thì không auto reply.
- status event:
  - RECEIVED
  - IGNORED
  - QUEUED
  - PROCESSING
  - COMPLETED
  - FAILED

Không block webhook trong lúc chờ AI.
Phản hồi HTTP 200 nhanh, xử lý tiếp bằng background job.

---

# 6. Debounce / gom tin nhắn

Đây là chức năng quan trọng.

Khách có thể gửi:

```text
shop ơi
giá bao nhiêu
ship Hà Nội không
```

Không gọi AI 3 lần.

Mỗi message:
1. lưu DB.
2. enqueue/re-schedule job theo `conversation_id`.
3. chờ mặc định 5 giây kể từ message cuối.
4. lấy tất cả pending message chưa xử lý.
5. lock atomically.
6. ghép theo `created_at`.
7. đánh dấu processed.
8. gọi AI một lần.

Không dùng `sleep()` trong HTTP request.

Có thể dùng pg-boss singleton key theo conversation.

Tạo indexes phù hợp.

---

# 7. Lịch sử hội thoại

Trước khi gọi AI:
- đồng bộ tối đa 30 tin gần nhất từ Pancake API nếu cần.
- hoặc dùng local DB nếu đủ mới.
- format transcript:

```text
Khách: ...
Shop (bot): ...
Nhân viên An: ...
Khách: ...
```

Phải phân biệt:
- customer
- human admin
- AI/bot

Mặc định context 30 messages, cấu hình theo Page.

---

# 8. AI Agent

Tạo interface:

```ts
interface AIProvider {
  generateAgentResponse(input: AgentInput): Promise<AgentResult>
}
```

`AgentInput` tối thiểu:

```ts
type AgentInput = {
  page: PageConfig;
  conversation: Conversation;
  customer: CustomerContext | null;
  transcript: TranscriptMessage[];
  pendingMessage: string;
};
```

`AgentResult`:

```ts
type AgentResult = {
  text: string;
  actions: AgentAction[];
  toolCalls: ToolCallLog[];
  raw?: unknown;
};
```

KHÔNG dùng marker `[CHOT_DON]`, `[GUI_ANH_SP]` làm contract chính trong app mới.

Dùng structured actions:

```ts
type AgentAction =
  | { type: "TAG_CONVERSATION"; tagId: string }
  | { type: "SEND_PRODUCT_IMAGES"; assetGroupId: string }
  | { type: "CREATE_ORDER_INTENT"; data: OrderIntent }
  | { type: "ESCALATE_HUMAN"; reason: string };
```

Có thể vẫn hỗ trợ parser marker cũ ở compatibility layer, nhưng core phải dùng structured output.

---

# 9. System prompt mặc định cho sales agent

Mỗi Page chỉnh được prompt trong UI.

Template mặc định:

```text
Bạn là nhân viên bán hàng của {{page_name}}.

Quy tắc:
- Trả lời tự nhiên, ngắn gọn, tiếng Việt.
- Xưng "em".
- Nếu biết khách nam gọi Anh, nữ gọi Chị, chưa rõ gọi Anh/Chị.
- Không tự bịa thông tin sản phẩm.
- Với câu hỏi liên quan sản phẩm, phải dùng tool get_product_info trước khi trả lời.
- Không tự thay đổi giá, khuyến mãi, quà tặng.
- Khi cần kiểm tra đơn cũ/giao hàng/trạng thái đơn phải dùng check_order_status.
- Khi khách có dấu hiệu chốt đơn, dùng check_customer_history trước.
- Không hỏi lại dữ liệu đã có trong lịch sử.
- Số điện thoại Việt Nam thông thường cần validate trước khi xác nhận.
- Chỉ coi là đủ dữ liệu chốt đơn khi đã có phone + address.
- Nếu chưa có tên khách thì có thể dùng tên profile.
- Nếu khách muốn xem ảnh sản phẩm, trả về action SEND_PRODUCT_IMAGES.
- Không tự tạo thông tin y tế, chính sách, giá, tồn kho nếu tool không cung cấp.
- Nếu không đủ dữ liệu để trả lời, nói rõ và chuyển human nếu cần.
```

Prompt thực tế lưu database.

---

# 10. Agent tools

## 10.1 get_product_info

Không phụ thuộc Google Sheet trong core.

Tạo bảng sản phẩm trong DB.

Tool:

```ts
get_product_info({
  pageId,
  query
})
```

Trả:
- product name
- sku
- price
- promo
- description
- usage
- key selling points
- FAQ
- images
- active status

WebUI phải cho CRUD sản phẩm.

Sau này có thể làm Google Sheets sync adapter, nhưng không bắt buộc MVP.

---

## 10.2 check_customer_history

Input:
- conversationId
- customerPlatformId

Output:
- name
- phone
- address
- previous orders
- internal notes

AI phải gọi tool này trước khi hỏi lại phone/address nếu có khả năng dữ liệu đã tồn tại.

---

## 10.3 check_order_status

Input:
- phone hoặc order code

Output:
- order code
- created_at
- status
- shipment status
- tracking
- COD
- items

MVP cho phép order data lưu local DB.

Thiết kế adapter để sau này nối API order thật.

---

# 11. Chốt đơn

Workflow hiện tại dùng tín hiệu AI để gắn tag.

App mới:

1. AI phát hiện intent mua.
2. check customer history.
3. validate:
   - phone
   - address
4. nếu đủ:
   - lưu/update customer.
   - tạo `order_intent`.
   - action `TAG_CONVERSATION`.
5. tag ID lấy từ Page config.
6. KHÔNG tự tạo đơn thật trừ khi integration cụ thể được bật.

WebUI hiển thị funnel:
- đang tư vấn
- có ý định mua
- đủ thông tin
- AI chốt
- human xác nhận
- đã lên đơn

---

# 12. Gửi ảnh sản phẩm

Tạo Product Asset Group:

```text
Liproin / ảnh sản phẩm
  - image 1
  - image 2
```

AI action:
```json
{
  "type": "SEND_PRODUCT_IMAGES",
  "assetGroupId": "..."
}
```

Backend gọi Pancake API.

Không hard-code:
- content_ids
- attachment_ids
- content_urls

Các asset này lưu DB.

UI cho upload/nhập URL và chọn nhóm ảnh mặc định của Page.

---

# 13. Xử lý response của AI

Không gửi một đoạn quá dài.

Implement hàm:

```ts
splitResponse(text, maxChunks = 3)
```

Quy tắc:
- ưu tiên ngắt theo câu.
- tiếp theo theo newline.
- tối đa mặc định 3 chunks.
- không tạo chunk rỗng.
- không làm mất ký tự.
- action metadata không được đưa vào text gửi khách.

Gửi từng chunk cách nhau mặc định 2 giây.

Delay phải là job scheduling, không block event loop.

---

# 14. Inbox flow

```text
Webhook
 -> validate
 -> deduplicate
 -> page rules
 -> save message
 -> debounce conversation
 -> acquire conversation lock
 -> get pending text
 -> get recent conversation
 -> get customer context
 -> AI agent
 -> execute tool calls
 -> structured output
 -> execute actions
 -> split text
 -> send message chunks
 -> update logs
```

---

# 15. Comment flow

Nếu conversation type là COMMENT:

1. reply public comment bằng template:
   - ví dụ: "Chào {{name}}, cảm ơn Anh/Chị đã quan tâm. Em đã inbox để tư vấn kỹ hơn ạ."
2. private reply cho khách.
3. AI có thể xử lý nội dung comment để tạo private reply cá nhân hóa.
4. tránh duplicate private reply.
5. log đầy đủ public + private action.

Cho phép bật/tắt:
- public reply
- AI private reply

---

# 16. Human takeover

Đây là chức năng bắt buộc cho tool thực tế.

Conversation có mode:
- AI
- HUMAN
- PAUSED

Nếu human gửi tin:
- tùy Page config, tự pause AI trong X phút.
- mặc định 30 phút.

Nút trên UI:
- "AI xử lý"
- "Nhân viên xử lý"
- "Tạm dừng"

Nếu conversation có excluded tag:
- AI không gửi.

Nếu AI confidence thấp / tool lỗi nhiều lần:
- action `ESCALATE_HUMAN`.

---

# 17. Database schema tối thiểu

Tạo Prisma schema với các bảng sau.

## User
- id
- email
- passwordHash
- name
- role
- createdAt
- updatedAt

## Page
- id
- platform
- platformPageId unique
- name
- active
- aiEnabled
- provider
- model
- systemPrompt
- debounceSeconds default 5
- responseDelaySeconds default 2
- maxResponseChunks default 3
- contextWindow default 30
- autoReplyInbox
- autoReplyComment
- autoPrivateReply
- humanTakeoverMinutes
- createdAt
- updatedAt

## PageSecret
Không trả raw secret qua API frontend.

- id
- pageId
- encryptedPageAccessToken
- encryptedGlobalAccessToken
- createdAt
- updatedAt

MVP có thể encrypt bằng `APP_ENCRYPTION_KEY`.

## PageRule
- id
- pageId
- excludedTagIds JSON
- orderTagId nullable
- negativeTagId nullable
- highPriorityTagId nullable

## Product
- id
- pageId
- sku
- name
- active
- price
- promo
- description
- usage
- faq JSON
- metadata JSON
- createdAt
- updatedAt

## AssetGroup
- id
- pageId
- productId nullable
- name
- active

## Asset
- id
- assetGroupId
- type IMAGE
- pancakeContentId nullable
- pancakeAttachmentId nullable
- url
- sortOrder

## Conversation
- id
- pageId
- platformConversationId
- customerPlatformId
- customerName
- type INBOX|COMMENT
- mode AI|HUMAN|PAUSED
- pauseUntil nullable
- lastMessageAt
- lastAiReplyAt
- tags JSON
- metadata JSON
- unique(pageId, platformConversationId)

## Message
- id
- conversationId
- platformMessageId unique
- direction INBOUND|OUTBOUND
- senderType CUSTOMER|HUMAN|AI|SYSTEM
- senderName nullable
- text
- rawPayload JSON
- processed boolean
- createdAt

Index:
- conversationId + createdAt
- processed + conversationId

## PendingMessage
Có thể dùng Message.processed thay bảng riêng.
Nếu tách bảng:
- id
- conversationId
- platformMessageId unique
- text
- processed
- createdAt

## Customer
- id
- pageId
- platformCustomerId
- name
- phone
- address
- notes
- createdAt
- updatedAt

## Order
- id
- pageId
- customerId
- code
- status
- shipmentStatus
- trackingCode
- total
- cod
- items JSON
- raw JSON
- createdAt
- updatedAt

## OrderIntent
- id
- conversationId
- customerId nullable
- phone
- address
- customerName
- status
- aiReason
- createdAt

## WebhookEvent
- id
- requestId nullable
- pageId nullable
- eventType
- status
- rawPayload JSON
- error nullable
- createdAt

## AIExecution
- id
- pageId
- conversationId
- provider
- model
- inputText
- outputText
- actions JSON
- latencyMs
- inputTokens nullable
- outputTokens nullable
- estimatedCost nullable
- error nullable
- createdAt

## ToolExecution
- id
- aiExecutionId
- toolName
- input JSON
- output JSON
- success
- latencyMs
- error nullable

## OutboundMessage
- id
- conversationId
- text
- platformMessageId nullable
- status PENDING|SENT|FAILED
- attempts
- error nullable
- createdAt
- sentAt nullable

---

# 18. Pancake client

Tạo class:

```ts
class PancakeClient {
  getConversationMessages(...)
  sendInboxMessage(...)
  replyComment(...)
  privateReply(...)
  addConversationTag(...)
  getPageTags(...)
  sendAssets(...)
}
```

Base URLs và auth phải configurable.

Tất cả request:
- timeout.
- retry exponential backoff cho 429/5xx.
- không retry 4xx validation.
- mask token trong logs.
- ghi response status + latency.

Không log secret.

---

# 19. API endpoints nội bộ

## Auth
```text
POST /auth/login
POST /auth/logout
GET  /auth/me
```

## Dashboard
```text
GET /dashboard/summary
GET /dashboard/timeseries
```

## Pages
```text
GET    /pages
POST   /pages
GET    /pages/:id
PATCH  /pages/:id
DELETE /pages/:id
POST   /pages/:id/test-connection
POST   /pages/:id/sync-tags
```

## Products
```text
GET    /pages/:pageId/products
POST   /pages/:pageId/products
PATCH  /products/:id
DELETE /products/:id
```

## Assets
```text
POST   /asset-groups
PATCH  /asset-groups/:id
POST   /asset-groups/:id/assets
DELETE /assets/:id
```

## Conversations
```text
GET   /conversations
GET   /conversations/:id
PATCH /conversations/:id/mode
POST  /conversations/:id/send
POST  /conversations/:id/retry-ai
```

## AI
```text
POST /ai/test
GET  /ai/executions
GET  /ai/executions/:id
```

## Logs
```text
GET /webhook-events
GET /outbound-messages
```

---

# 20. WebUI bắt buộc

## 20.1 Login

Đơn giản, sạch.

---

## 20.2 Dashboard

Cards:
- Tin nhắn hôm nay
- Conversation AI đã xử lý
- AI replies
- Tỷ lệ AI lỗi
- Số conversation chuyển human
- Số khách có tín hiệu chốt
- Số AI chốt đủ data
- Estimated AI cost

Charts:
- messages / day
- AI replies / day
- order intents / day

Recent errors panel.

---

## 20.3 Pages

Table:
- tên Page
- page ID
- AI on/off
- model
- trạng thái connection
- tin hôm nay
- lỗi gần nhất

Actions:
- Thêm Page
- Sửa
- Test connection
- Đồng bộ tag
- Bật/tắt AI

---

## 20.4 Page Settings

Tabs:

### General
- name
- platform page id
- active

### Pancake
- page access token masked
- global access token masked
- test API
- sync tags

### AI
- provider
- model
- API key reference
- system prompt editor
- temperature nếu provider hỗ trợ
- context window
- debounce
- response delay
- max chunks

### Rules
- excluded tags multi-select
- order tag
- human takeover timeout
- inbox/comment toggles

### Assets
- nhóm ảnh sản phẩm

---

## 20.5 Conversations

UI giống inbox CRM.

Left:
- danh sách hội thoại
- search
- filters
- AI/HUMAN/PAUSED
- page
- tag

Center:
- message timeline
- customer vs AI vs human khác style
- message status
- AI action badges

Bottom:
- ô gửi tin thủ công
- nút AI/Human
- pause AI

Right sidebar:
- customer name
- phone
- address
- tags
- order history
- AI summary
- order intent

Không cần clone Pancake 100%, chỉ cần dùng tốt.

---

## 20.6 Products

CRUD product.

Form:
- tên
- SKU
- giá
- khuyến mãi
- mô tả
- cách dùng
- FAQ
- trạng thái
- ảnh

Có nút "Test hỏi AI về sản phẩm này".

---

## 20.7 AI Playground

Cho phép chọn Page và giả lập câu khách:

```text
"shop ơi giá bao nhiêu?"
```

Hiển thị:
- final answer
- tool calls
- retrieved product info
- actions
- token usage
- latency

Nút:
- "Chạy thử"
- không gửi ra Pancake.

Đây là chức năng quan trọng để chỉnh prompt.

---

## 20.8 Logs

Tabs:
- Webhook
- AI
- Tool calls
- Outbound requests
- Errors

Có JSON viewer.

Secret phải redact.

---

# 21. UX/UI

Phong cách:
- SaaS admin hiện đại.
- sidebar trái.
- background sáng.
- layout rộng.
- responsive desktop-first.
- không dùng gradient màu mè.
- trạng thái dùng badge rõ ràng.
- loading/skeleton đầy đủ.
- empty state.
- toast thành công/lỗi.

Tên sản phẩm UI:
**AI Page Operator**

Có thể đặt subtitle:
**AI trực Page & hỗ trợ chốt đơn**

---

# 22. Xử lý lỗi

Các lỗi AI/Pancake không được làm worker crash.

Retry policy:
- Pancake 429/5xx: max 3 attempts.
- AI 429/5xx/timeouts: max 3 attempts.
- database deadlock: retry.
- invalid webhook: log + 200/400 tùy loại.

Sau retry vẫn fail:
- WebhookEvent FAILED.
- tạo error log.
- conversation badge cần human.
- không gửi message bịa để che lỗi.

---

# 23. Concurrency

Cần đảm bảo 1 conversation chỉ có tối đa 1 AI processing job tại một thời điểm.

Có thể dùng:
- pg-boss singleton job key
- PostgreSQL advisory lock
- transaction row lock

Chọn một cách rõ ràng và test.

Case test:
- khách gửi 5 messages trong 3 giây.
- webhook tới lệch thứ tự.
- worker chạy 2 instance.
- chỉ được có 1 AI response cho batch hợp lệ.

---

# 24. Security

BẮT BUỘC:
- `.env` không commit.
- `.env.example` không chứa secret thật.
- token mã hóa at-rest.
- API không trả token raw.
- log redact:
  - Authorization
  - access_token
  - page_access_token
  - api_key
- webhook payload giới hạn size.
- rate limit login.
- validation bằng Zod.
- SQL qua Prisma/prepared statements.
- không nối raw user text trực tiếp vào SQL.
- CORS cấu hình rõ.
- secure cookie production.
- CSRF strategy cho mutation WebUI nếu cần.

---

# 25. Environment variables

Tạo `.env.example`:

```env
NODE_ENV=development

DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ai_page_operator

APP_URL=http://localhost:3000
API_URL=http://localhost:4000

SESSION_SECRET=change_me
APP_ENCRYPTION_KEY=change_me_32_bytes

DEEPSEEK_API_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

PANCAKE_API_BASE_URL=https://pages.fm/api
PANCAKE_PUBLIC_API_BASE_URL=https://pages.fm/api/public_api/v1
```

Page access token không nhất thiết để env vì multi-page; lưu encrypted DB.

---

# 26. Docker local development

`docker-compose.yml` tối thiểu:
- postgres

App web/api chạy local bằng pnpm.

Commands:

```bash
pnpm install
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Root `pnpm dev` chạy cả web + api.

---

# 27. Seed data

Seed:
- admin user development
- 1 demo Page
- 1 demo Product

Không dùng token thật.

README phải ghi credential demo dev.

---

# 28. Tests bắt buộc

Dùng Vitest.

Unit tests:
- webhook parser
- page router
- excluded tags
- response splitter
- phone validator
- AI structured output parser
- marker compatibility parser
- debounce behavior

Integration tests:
- duplicate message event
- multi-message debounce
- order intent detection
- send product images
- human takeover
- Pancake retry

Mock Pancake/AI APIs.

---

# 29. Compatibility với workflow cũ

Tạo `docs/workflow-mapping.md`.

Map:

```text
n8n Webhook                    -> POST /webhooks/pancake
Filter timestamp               -> webhook validation
Switch page_id                 -> Page DB lookup/router
Filter tags                    -> PageRule.excludedTagIds
Insert Pending                 -> Message/PendingMessage DB
Wait 5 sec                     -> pg-boss debounce job
Atomic Get & Mark              -> transaction/locking
Get conversation messages      -> PancakeClient.getConversationMessages
Build transcript               -> transcript service
AI Agent                       -> ai-core AgentRunner
get_product_info               -> ProductTool
check_customer_histories       -> CustomerHistoryTool
check_order_status             -> OrderStatusTool
[CHOT_DON]                     -> structured TAG_CONVERSATION / CREATE_ORDER_INTENT
[GUI_ANH_SP]                   -> structured SEND_PRODUCT_IMAGES
Split Response                 -> response splitter
Wait Between Messages          -> scheduled outbound chunks
reply_inbox                    -> PancakeClient.sendInboxMessage
reply_comment                  -> PancakeClient.replyComment
private_replies                -> PancakeClient.privateReply
add tag                        -> PancakeClient.addConversationTag
Postgres Chat Memory           -> local Conversation/Message context
```

---

# 30. Không bê nguyên các điểm yếu của workflow cũ

Không:
- hard-code page ID trong switch source.
- hard-code tag ID trong source.
- hard-code token.
- tạo một AI workflow riêng cho từng brand.
- dùng prompt marker làm business contract duy nhất.
- viết SQL bằng string interpolation từ message của khách.
- chờ bằng sleep trong request.
- dùng Google Sheet làm database chính.
- lưu credential trong JSON workflow.
- phụ thuộc admin_name cố định mà không có fallback.

---

# 31. Phase triển khai

Claude Code phải thực hiện theo thứ tự này và commit logical changes nếu git repo đã init.

## Phase 1 — Bootstrap
- monorepo
- Next.js
- Fastify
- Prisma
- Postgres
- auth
- base layout

## Phase 2 — Pancake webhook
- webhook schema
- WebhookEvent
- Page router
- dedupe
- save conversations/messages

## Phase 3 — Queue + debounce
- pg-boss
- worker
- atomic batch processing

## Phase 4 — Pancake API client
- fetch conversation
- reply inbox
- tags
- comment/private reply

## Phase 5 — AI
- provider abstraction
- tools
- structured response
- prompt config
- AIExecution logs

## Phase 6 — Actions
- chốt đơn
- send product images
- human escalation
- split response + delayed sending

## Phase 7 — WebUI
- dashboard
- pages
- conversations
- products
- playground
- logs

## Phase 8 — Tests + docs
- unit
- integration
- docker
- README
- workflow mapping

---

# 32. Definition of Done cho MVP

MVP chỉ được coi là xong khi demo được đầy đủ case sau:

### Case A — Inbox hỏi giá
1. webhook nhận message.
2. UI thấy message.
3. debounce.
4. AI bắt buộc tra product.
5. AI trả lời.
6. Pancake nhận reply.
7. log AI/tool/outbound có đủ.

### Case B — Khách gửi 3 tin liên tiếp
1. nhận 3 webhook.
2. chỉ một AI run.
3. AI thấy đầy đủ nội dung 3 tin.

### Case C — Khách muốn ảnh
1. AI tạo action SEND_PRODUCT_IMAGES.
2. backend gửi đúng asset group.

### Case D — Khách chốt
1. AI check customer history.
2. có phone + address.
3. tạo order intent.
4. gắn tag Pancake cấu hình.
5. UI hiển thị "AI chốt".

### Case E — Hỏi đơn hàng
1. AI gọi check_order_status.
2. không tự bịa trạng thái.

### Case F — Comment
1. reply comment.
2. private reply.
3. log cả hai.

### Case G — Human takeover
1. nhân viên gửi tin.
2. AI pause.
3. không tranh trả lời với nhân viên.

---

# 33. Coding style

- strict TypeScript.
- không dùng `any` nếu tránh được.
- Zod ở API boundaries.
- service/repository tách rõ.
- function ngắn.
- tên biến rõ.
- error classes typed.
- dùng UTC trong DB.
- format timezone ở UI.
- ESLint + Prettier.
- comments chỉ khi logic không tự rõ.

---

# 34. Trước khi code

Claude Code cần:

1. đọc toàn bộ `CLAUDE.md`.
2. kiểm tra repo hiện tại.
3. nếu repo trống thì bootstrap.
4. tạo `docs/architecture.md`.
5. tạo checklist `docs/progress.md`.
6. sau đó bắt đầu code, không dừng ở bước lập kế hoạch.

Nếu gặp API Pancake chưa rõ:
- tạo typed adapter/interface trước.
- cô lập assumption vào `PancakeClient`.
- dùng fixture/mock.
- ghi assumption vào `docs/pancake-api-notes.md`.
- không để assumption lan ra business logic.

---

# 35. Khi sửa code trong các lượt tiếp theo

Luôn:
- đọc `docs/progress.md`.
- cập nhật progress.
- chạy typecheck.
- chạy test liên quan.
- không phá API đã hoạt động nếu không cần.
- nếu thay schema Prisma thì tạo migration.
- nếu thêm env thì cập nhật `.env.example`.
- nếu thêm endpoint thì cập nhật Swagger.

---

# 36. Lệnh Claude Code nên thực hiện ngay sau khi đọc file này

Nếu repo đang trống:

```text
Hãy đọc CLAUDE.md và bắt đầu build AI Page Operator từ Phase 1.
Không chỉ đưa hướng dẫn. Hãy trực tiếp tạo project, source code, Prisma schema,
Docker Compose, .env.example, README, docs/architecture.md và docs/progress.md.
Sau đó chạy install/typecheck/test cần thiết và sửa các lỗi phát sinh.
Tiếp tục sang Phase 2 nếu Phase 1 đã chạy ổn.
```

Nếu repo đã có source:
- audit repo.
- giữ phần dùng được.
- refactor theo kiến trúc ở file này.
- không xóa code đang chạy nếu chưa có replacement.

---

# 37. Ưu tiên sản phẩm

Thứ tự ưu tiên:
1. Không gửi sai tin cho khách.
2. Không duplicate reply.
3. Không AI bịa thông tin sản phẩm/đơn hàng.
4. Human có thể takeover.
5. Logs đủ để debug.
6. Dễ thêm Page mới từ UI.
7. Dễ chỉnh prompt/model mà không sửa code.
8. UI đẹp.
9. Analytics nâng cao.

Reliability quan trọng hơn animation/UI fancy.
