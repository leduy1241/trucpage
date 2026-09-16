# Kiến trúc AI Page Operator

Monorepo gồm Next.js WebUI, Fastify API, Prisma/PostgreSQL và packages dùng chung. Webhook được xác thực, ghi log trước, loại sự kiện cũ/echo/trùng, sau đó lưu hội thoại và message. Worker pg-boss dùng singleton key theo conversation để debounce và PostgreSQL advisory lock để bảo đảm một AI run tại một thời điểm.

Worker gom message chưa xử lý, dựng transcript, gọi provider theo Page, lưu AIExecution, kiểm tra structured actions, tách câu trả lời và tạo OutboundMessage. Mỗi chunk được schedule riêng; Pancake client chịu trách nhiệm timeout và retry.

Các ranh giới chính: Pancake client chỉ phụ trách HTTP; AgentRunner chỉ làm orchestration AI/tool; action executor xử lý side effect; database lưu mọi cấu hình đặc thù Page.
