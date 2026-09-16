# Mapping workflow cũ

| n8n | AI Page Operator |
|---|---|
| Webhook | `POST /webhooks/pancake` |
| Filter timestamp/tags | webhook validation + PageRule |
| Switch page | Page DB lookup |
| Pending + Wait | Message + pg-boss debounce |
| AI Agent | AgentRunner |
| Markers | structured AgentAction |
| Reply/tag/assets | PancakeClient + action executor |
