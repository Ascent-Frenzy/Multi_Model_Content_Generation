# Frontend — apps/frontend

**Branch:** `feature/frontend`  
**Framework:** Next.js 14 (App Router)  
**Developer owns:** everything in `apps/frontend/`

Read the root `CLAUDE.md` and the full spec first:  
`docs/superpowers/specs/2026-05-17-ai-multimodal-synthesis-design.md`

---

## Responsibility

The user-facing dashboard. This service only talks to the backend (never directly to Redis, S3, or the worker).

---

## App Router Structure

```
app/
  (auth)/
    login/page.tsx
    register/page.tsx
  (dashboard)/
    layout.tsx              ← auth guard + sidebar
    page.tsx                ← dashboard home / content library
    brand/
      page.tsx              ← brand profile list
      [id]/page.tsx         ← edit brand (colors, tone, fonts, logo)
      [id]/assets/page.tsx  ← upload clips + images
    create/
      carousel/page.tsx     ← topic input → script review → approve
      reel/page.tsx         ← topic input → script review → approve
    editor/
      [id]/page.tsx         ← Fabric.js canvas editor (carousel + reel)
    schedule/
      page.tsx              ← agent schedule view (upcoming posts + reasoning)
components/
  ui/                       ← shadcn/ui primitives only (no custom styles here)
  editor/                   ← Fabric.js canvas components
  brand/                    ← brand config form components
  schedule/                 ← schedule card, approve/reschedule UI
lib/
  api/                      ← typed API client (wraps fetch, uses React Query)
  store/                    ← Zustand stores (auth, brand, content)
  hooks/                    ← custom hooks (useRenderProgress, useAgentSchedule)
```

---

## Key Libraries

```json
{
  "next": "14.x",
  "tailwindcss": "^3",
  "@shadcn/ui": "latest",
  "zustand": "^4",
  "@tanstack/react-query": "^5",
  "fabric": "^5",
  "socket.io-client": "^4",
  "axios": "^1"
}
```

---

## Environment Variables

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=http://localhost:4000
```

---

## Asset Upload Flow (presigned URL)

Never send file bytes to the backend. The pattern is:

```typescript
// 1. Get presigned URL from backend
const { presignedUrl, s3Key } = await api.get(
  `/brands/${brandId}/upload-url?type=clip&filename=${file.name}`
);

// 2. PUT directly to S3
await fetch(presignedUrl, { method: 'PUT', body: file });

// 3. Confirm with backend
await api.post(`/brands/${brandId}/assets/confirm`, {
  s3Key, filename: file.name, type: 'clip',
  mimeType: file.type, sizeBytes: file.size,
});
```

---

## WebSocket Integration

Connect once on dashboard mount, subscribe to:

| Event | When |
|---|---|
| `render:progress` | Show progress bar on content card |
| `render:complete` | Swap placeholder with rendered thumbnail |
| `render:failed` | Show error state on content card |
| `agent:scheduled` | Add new item to schedule view |

Use the `useRenderProgress(contentItemId)` hook — don't add socket listeners scattered across components.

---

## Content Generation Wizard

Both carousel and reel follow the same two-step UX:

1. **Step 1 — Topic Input**: user enters topic + selects brand profile → POST to `/content/carousel` or `/content/reel` → backend returns script/slides preview
2. **Step 2 — Script Review**: user reads and edits the generated script/slides → clicks Approve → PATCH `/content/:id/approve-script` → render begins, redirect to editor

Never skip step 2 — the user must explicitly approve before the worker starts rendering.

---

## Editor (Fabric.js)

- Carousel editor: each slide is a Fabric.js canvas. Editable: headline, body text, background color, overlay images.
- Reel editor: timeline view of segments. Editable: captions, segment order, clip selection.
- On save: PATCH `/content/:id` with updated `slides` or `segments` array.
- Do not re-render from the editor — rendering only happens after script approval.

---

## State Management Rules

- **Server state** (API data): TanStack React Query. No Zustand for server state.
- **Client/UI state** (modals, form steps, selected brand): Zustand.
- **Auth state**: Zustand + localStorage (JWT token).

---

## Do Not

- Do not call the worker-renderer directly — all requests go through the backend API
- Do not store the JWT in a cookie — use localStorage with the Zustand auth store
- Do not build custom UI components when a shadcn/ui primitive exists
- Do not add business logic to page components — keep pages thin, logic in hooks
