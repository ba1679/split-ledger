# Codex memory investigation — 2026-11-11

The user reports that the other computer froze while implementing 005, with Codex / Codex Helper (Renderer) using approximately 20 GB. This investigation cannot inspect that computer's process history or heap. The observations below come from the current computer and do not establish the other computer's root cause.

## Observed evidence

- The handoff commit contains 704 changed files, 44,879 additions and 172 deletions relative to the merged plan. This is a substantial review surface, but file count alone does not demonstrate a renderer leak.
- Locally available November session files for this repository totaled approximately 87.2 MB across 62 files at inspection time, including parent and delegated sessions. Serialized transcript size is not equivalent to live memory usage and cannot explain 20 GB by itself.
- The current computer's November 10 app logs contain 35,748 `worker_rpc_response_error` entries reporting `Git is unavailable`, with a peak of 192 warnings per minute. They also contain 1,042 `ResizeObserver loop` errors that day (1,907 on November 9), plus conversation-state errors. These establish repeated app errors on this computer, not their allocation cost or the other computer's behavior.
- No exact `out of memory`, `OOM`, `heap out`, `render-process-gone`, or `memory pressure` message was found in the inspected November app logs. No matching Codex/ChatGPT crash or memory report was found in the current user's DiagnosticReports directory.
- A current-process RSS sample showed nine Codex Renderer processes totaling about 469 MiB. This is a point-in-time RSS sample, not Activity Monitor's memory accounting, a historical peak, or a measurement of the other computer. It does not reproduce the reported 20 GB.
- The previous implementation's validation log records repeated WebKit actionability/context failures at T254. These failures do not establish a link to Codex Renderer memory. Browser-test child processes and the Codex Renderer must be measured separately.

## Working hypotheses and next evidence

Given the reported process name, renderer retention during a long conversation, tool-output rendering, or a large review view is a plausible direction. Repeated app error handling is another lead. These remain hypotheses; no heap snapshot or allocation timeline was available to distinguish them.

On the affected computer, record the exact app version and OS, the individual high-memory process name/PID, memory before opening the chat, after opening it, and after opening the review pane. Preserve that day's app logs and any OS diagnostic report before restarting. If the large rise follows the chat or review pane, include those steps in a feedback report. If it instead follows test execution, capture the child-process breakdown. Do not delete session history as a diagnostic step.

For continued work, keep tool output bounded, run one browser suite at a time, retain progress in tasks/validation, and use a fresh chat when a long chat becomes unresponsive. Restart the app after active work finishes if it remains stuck. These reduce exposure and improve diagnosis; they are not a confirmed fix for the reported memory growth.

The [official troubleshooting documentation](https://learn.chatgpt.com/docs/reference/troubleshooting) identifies macOS app logs at `~/Library/Logs/com.openai.codex/YYYY/MM/DD` and session transcripts under `$CODEX_HOME/sessions`; it recommends trying a smaller fresh chat for stuck chats and restarting after active work completes if terminal issues persist. It does not identify a documented 20 GB renderer root cause. No logs or feedback were sent externally during this investigation.
