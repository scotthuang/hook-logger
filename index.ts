import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { definePluginEntry } from "openclaw/plugin-sdk/plugin-entry";

const HOME = os.homedir();
const LOG_DIR = path.join(HOME, ".openclaw", "workspace", "logs", "hook-logger");
const MAX_DAYS = 3;

// Ensure log directory exists synchronously
function ensureDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

// Get local timezone timestamp (Asia/Shanghai)
function getLocalTimestamp() {
  return new Date().toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

// Get log file path by date (local timezone)
function getLogFilePath() {
  const now = new Date();
  const dateStr = now.toLocaleString("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).replace(/\//g, "-");
  return path.join(LOG_DIR, `${dateStr}.log`);
}

// Clean old logs (keep only last 3 days) - synchronous
function cleanOldLogs() {
  try {
    if (!fs.existsSync(LOG_DIR)) return;

    const files = fs.readdirSync(LOG_DIR);
    const now = Date.now();
    const msPerDay = 24 * 60 * 60 * 1000;
    const cutoff = now - (MAX_DAYS * msPerDay);

    for (const file of files) {
      if (!file.endsWith(".log")) continue;
      const filePath = path.join(LOG_DIR, file);
      try {
        const stat = fs.statSync(filePath);
        if (stat.mtimeMs < cutoff) {
          fs.unlinkSync(filePath);
        }
      } catch (e) {
        // Ignore errors
      }
    }
  } catch (e) {
    // Ignore errors
  }
}

// Log helper - synchronous
function log(hookName: string, data: unknown) {
  ensureDir();
  cleanOldLogs();

  const timestamp = getLocalTimestamp();
  const entry = `[${timestamp}] ${hookName} | ${JSON.stringify(data)}`;

  const logFile = getLogFilePath();
  fs.appendFileSync(logFile, entry + "\n");
}

// Safe log wrapper - never let logging break the hook chain
function safeLog(hookName: string, data: unknown) {
  try {
    log(hookName, data);
  } catch (e) {
    // Never break hook chain
  }
}

export default definePluginEntry({
  id: "hook-logger",
  name: "Hook Logger",
  description: "Log all hook stages for debugging in OpenClaw",

  register(api) {
    // before_model_resolve
    api.on("before_model_resolve", (event) => {
      safeLog("before_model_resolve", {
        prompt: String(event.prompt ?? "").slice(0, 100),
        attachments: event.attachments?.length ?? 0,
      });
    });

    // agent_turn_prepare
    api.on("agent_turn_prepare", (event) => {
      safeLog("agent_turn_prepare", {
        prompt: String(event.prompt ?? "").slice(0, 100),
        messagesCount: Array.isArray(event.messages) ? event.messages.length : "unknown",
        queuedInjectionsCount: event.queuedInjections?.length ?? 0,
      });
    });

    // before_prompt_build
    api.on("before_prompt_build", (event) => {
      safeLog("before_prompt_build", {
        prompt: String(event.prompt ?? "").slice(0, 100),
        messagesCount: Array.isArray(event.messages) ? event.messages.length : "unknown",
      });
    });

    // before_agent_run
    api.on("before_agent_run", (event) => {
      safeLog("before_agent_run", {
        prompt: String(event.prompt ?? "").slice(0, 100),
        channelId: event.channelId,
        senderId: event.senderId,
        senderIsOwner: event.senderIsOwner,
      });
    });

    // before_agent_reply
    api.on("before_agent_reply", (event) => {
      safeLog("before_agent_reply", {
        cleanedBody: String(event.cleanedBody ?? "").slice(0, 100),
      });
    });

    // model_call_started
    api.on("model_call_started", (event) => {
      safeLog("model_call_started", {
        provider: event.provider,
        model: event.model,
        callId: event.callId,
        api: event.api,
        transport: event.transport,
      });
    });

    // model_call_ended
    api.on("model_call_ended", (event) => {
      safeLog("model_call_ended", {
        provider: event.provider,
        model: event.model,
        durationMs: event.durationMs,
        outcome: event.outcome,
        errorCategory: event.errorCategory,
      });
    });

    // llm_input
    api.on("llm_input", (event) => {
      safeLog("llm_input", {
        provider: event.provider,
        model: event.model,
        prompt: String(event.prompt ?? "").slice(0, 100),
        systemPrompt: String(event.systemPrompt ?? "").slice(0, 100),
        historyMessagesCount: Array.isArray(event.historyMessages) ? event.historyMessages.length : 0,
        imagesCount: event.imagesCount,
        toolsCount: Array.isArray(event.tools) ? event.tools.length : 0,
      });
    });

    // llm_output
    api.on("llm_output", (event) => {
      safeLog("llm_output", {
        provider: event.provider,
        model: event.model,
        assistantTextsCount: event.assistantTexts?.length ?? 0,
        usage: event.usage,
        resolvedRef: event.resolvedRef,
      });
    });

    // before_agent_finalize
    api.on("before_agent_finalize", (event) => {
      safeLog("before_agent_finalize", {
        sessionKey: event.sessionKey,
        sessionId: event.sessionId,
        stopHookActive: event.stopHookActive,
        provider: event.provider,
        model: event.model,
      });
    });

    // agent_end
    api.on("agent_end", (event) => {
      safeLog("agent_end", {
        success: event.success,
        error: event.error,
        durationMs: event.durationMs,
        messagesCount: Array.isArray(event.messages) ? event.messages.length : 0,
      });
    });

    // before_compaction
    api.on("before_compaction", (event) => {
      safeLog("before_compaction", {
        messageCount: event.messageCount,
        compactingCount: event.compactingCount,
        tokenCount: event.tokenCount,
      });
    });

    // after_compaction
    api.on("after_compaction", (event) => {
      safeLog("after_compaction", {
        messageCount: event.messageCount,
        compactedCount: event.compactedCount,
        tokenCount: event.tokenCount,
      });
    });

    // before_reset
    api.on("before_reset", (event) => {
      safeLog("before_reset", {
        reason: event.reason,
        sessionFile: event.sessionFile,
      });
    });

    // inbound_claim
    api.on("inbound_claim", (event) => {
      safeLog("inbound_claim", {
        content: String(event.content ?? "").slice(0, 100),
        channel: event.channel,
        senderId: event.senderId,
        isGroup: event.isGroup,
        commandAuthorized: event.commandAuthorized,
      });
    });

    // message_received
    api.on("message_received", (event) => {
      safeLog("message_received", {
        from: event.from,
        content: String(event.content ?? "").slice(0, 100),
        channelId: event.channelId,
        threadId: event.threadId,
        messageId: event.messageId,
      });
    });

    // message_sending
    api.on("message_sending", (event) => {
      safeLog("message_sending", {
        to: event.to,
        content: String(event.content ?? "").slice(0, 100),
        replyToId: event.replyToId,
        threadId: event.threadId,
      });
    });

    // message_sent
    api.on("message_sent", (event) => {
      safeLog("message_sent", {
        to: event.to,
        success: event.success,
        error: event.error,
      });
    });

    // before_dispatch
    api.on("before_dispatch", (event) => {
      safeLog("before_dispatch", {
        content: String(event.content ?? "").slice(0, 100),
        channel: event.channel,
        sessionKey: event.sessionKey,
        senderId: event.senderId,
        isGroup: event.isGroup,
      });
    });

    // reply_dispatch
    api.on("reply_dispatch", (event) => {
      safeLog("reply_dispatch", {
        sessionKey: event.ctx?.sessionKey,
        sendPolicy: event.sendPolicy,
        isTailDispatch: event.isTailDispatch,
        shouldSendToolSummaries: event.shouldSendToolSummaries,
        expectsCompletionMessage: event.expectsCompletionMessage,
      });
    });

    // before_tool_call
    api.on("before_tool_call", (event) => {
      safeLog("before_tool_call", {
        toolName: event.toolName,
        toolCallId: event.toolCallId,
        params: JSON.stringify(event.params ?? {}).slice(0, 200),
        toolKind: event.toolKind,
        runId: event.runId,
      });
    });

    // after_tool_call
    api.on("after_tool_call", (event) => {
      safeLog("after_tool_call", {
        toolName: event.toolName,
        toolCallId: event.toolCallId,
        durationMs: event.durationMs,
        error: event.error,
        result: JSON.stringify(event.result ?? {}).slice(0, 200),
      });
    });

    // tool_result_persist
    api.on("tool_result_persist", (event) => {
      safeLog("tool_result_persist", {
        toolName: event.toolName,
        toolCallId: event.toolCallId,
        isSynthetic: event.isSynthetic,
      });
    });

    // before_message_write
    api.on("before_message_write", (event) => {
      safeLog("before_message_write", {
        role: event.message?.role,
        content: JSON.stringify(event.message?.content ?? "").slice(0, 100),
      });
    });

    // session_start
    api.on("session_start", (event) => {
      safeLog("session_start", {
        sessionId: event.sessionId,
        sessionKey: event.sessionKey,
        resumedFrom: event.resumedFrom,
      });
    });

    // session_end
    api.on("session_end", (event) => {
      safeLog("session_end", {
        sessionId: event.sessionId,
        sessionKey: event.sessionKey,
        reason: event.reason,
        messageCount: event.messageCount,
        durationMs: event.durationMs,
      });
    });

    // subagent_spawning
    api.on("subagent_spawning", (event) => {
      safeLog("subagent_spawning", {
        childSessionKey: event.childSessionKey,
        agentId: event.agentId,
        mode: event.mode,
        label: event.label,
        threadRequested: event.threadRequested,
      });
    });

    // subagent_delivery_target
    api.on("subagent_delivery_target", (event) => {
      safeLog("subagent_delivery_target", {
        childSessionKey: event.childSessionKey,
        requesterSessionKey: event.requesterSessionKey,
        spawnMode: event.spawnMode,
        expectsCompletionMessage: event.expectsCompletionMessage,
      });
    });

    // subagent_spawned
    api.on("subagent_spawned", (event) => {
      safeLog("subagent_spawned", {
        childSessionKey: event.childSessionKey,
        runId: event.runId,
        agentId: event.agentId,
        mode: event.mode,
        label: event.label,
      });
    });

    // subagent_ended
    api.on("subagent_ended", (event) => {
      safeLog("subagent_ended", {
        targetSessionKey: event.targetSessionKey,
        targetKind: event.targetKind,
        outcome: event.outcome,
        reason: event.reason,
        error: event.error,
      });
    });

    // gateway_start
    api.on("gateway_start", (event) => {
      safeLog("gateway_start", { port: event.port });
    });

    // gateway_stop
    api.on("gateway_stop", (event) => {
      safeLog("gateway_stop", { reason: event.reason });
    });

    // heartbeat_prompt_contribution
    api.on("heartbeat_prompt_contribution", (event) => {
      safeLog("heartbeat_prompt_contribution", {
        sessionKey: event.sessionKey,
        agentId: event.agentId,
        heartbeatName: event.heartbeatName,
      });
    });

    // cron_changed
    api.on("cron_changed", (event) => {
      safeLog("cron_changed", {
        action: event.action,
        jobId: event.jobId,
        status: event.status,
        summary: event.summary?.slice(0, 200),
        sessionTarget: event.sessionTarget,
        agentId: event.agentId,
      });
    });

    // before_install
    api.on("before_install", (event) => {
      safeLog("before_install", {
        targetType: event.targetType,
        targetName: event.targetName,
        sourcePath: event.sourcePath,
        requestKind: event.request?.kind,
        requestMode: event.request?.mode,
      });
    });
  },
});
