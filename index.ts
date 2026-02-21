import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const HOME = os.homedir();
const LOG_DIR = path.join(HOME, ".openclaw", "workspace", "logs", "hook-logger");
const MAX_DAYS = 3;

// Ensure log directory exists synchronously
function ensureDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

// Get log file path by date
function getLogFilePath() {
  const date = new Date().toISOString().split("T")[0];
  return path.join(LOG_DIR, `${date}.log`);
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
function log(hookName, data) {
  console.log("[hook-logger] Logging:", hookName);
  ensureDir();
  cleanOldLogs();
  
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${hookName} | ${JSON.stringify(data)}`;
  
  const logFile = getLogFilePath();
  console.log("[hook-logger] Writing to:", logFile);
  fs.appendFileSync(logFile, entry + "\n");
}

export default {
  id: "hook-logger",
  name: "hook-logger",
  description: "Log all hook stages for debugging",
  
  register(api) {
    // before_model_resolve
    api.on("before_model_resolve", (event, ctx) => {
      log("before_model_resolve", { prompt: event.prompt?.slice(0, 100) });
      return ctx;
    });

    // before_prompt_build
    api.on("before_prompt_build", (event, ctx) => {
      log("before_prompt_build", { 
        prompt: event.prompt?.slice(0, 100),
        messagesCount: Array.isArray(event.messages) ? event.messages.length : 'unknown'
      });
      return ctx;
    });

    // before_agent_start
    api.on("before_agent_start", (event, ctx) => {
      log("before_agent_start", { 
        prompt: event.prompt?.slice(0, 100),
        sessionKey: ctx.sessionKey
      });
      return ctx;
    });

    // llm_input
    api.on("llm_input", (event, ctx) => {
      log("llm_input", { 
        model: event.model, 
        provider: event.provider,
        prompt: event.prompt?.slice(0, 100)
      });
      return ctx;
    });

    // llm_output
    api.on("llm_output", (event, ctx) => {
      log("llm_output", { 
        textsCount: event.assistantTexts?.length || 0,
        stopReason: event.lastAssistant?.stop_reason
      });
      return ctx;
    });

    // agent_end
    api.on("agent_end", (event, ctx) => {
      log("agent_end", { 
        success: event.success, 
        error: event.error,
        durationMs: event.durationMs
      });
      return ctx;
    });

    // before_compaction
    api.on("before_compaction", (event, ctx) => {
      log("before_compaction", { 
        messageCount: event.messageCount,
        tokenCount: event.tokenCount
      });
      return ctx;
    });

    // after_compaction
    api.on("after_compaction", (event, ctx) => {
      log("after_compaction", { 
        messageCount: event.messageCount,
        compactedCount: event.compactedCount
      });
      return ctx;
    });

    // before_reset
    api.on("before_reset", (event, ctx) => {
      log("before_reset", { reason: event.reason });
      return ctx;
    });

    // message_received
    api.on("message_received", (event, ctx) => {
      log("message_received", { 
        from: event.from, 
        content: event.content?.slice(0, 100)
      });
      return ctx;
    });

    // message_sending
    api.on("message_sending", (event, ctx) => {
      log("message_sending", { 
        to: event.to, 
        content: event.content?.slice(0, 100)
      });
      return ctx;
    });

    // message_sent
    api.on("message_sent", (event, ctx) => {
      log("message_sent", { 
        to: event.to, 
        success: event.success,
        error: event.error
      });
      return ctx;
    });

    // before_tool_call
    api.on("before_tool_call", (event, ctx) => {
      log("before_tool_call", { 
        tool: event.toolName, 
        args: JSON.stringify(event.params?.args || {}).slice(0, 200)
      });
      return ctx;
    });

    // after_tool_call
    api.on("after_tool_call", (event, ctx) => {
      log("after_tool_call", { 
        tool: event.toolName,
        result: JSON.stringify(event.result || event.error || {}).slice(0, 200)
      });
      return ctx;
    });

    // tool_result_persist
    api.on("tool_result_persist", (event, ctx) => {
      log("tool_result_persist", { 
        toolName: event.toolName,
        toolCallId: event.toolCallId
      });
      return ctx;
    });

    // before_message_write
    api.on("before_message_write", (event, ctx) => {
      log("before_message_write", { 
        role: event.message?.role,
        content: JSON.stringify(event.message?.content || '').slice(0, 100)
      });
      return ctx;
    });

    // session_start
    api.on("session_start", (event, ctx) => {
      log("session_start", { 
        sessionKey: event.sessionKey,
        agentId: event.agentId
      });
      return ctx;
    });

    // session_end
    api.on("session_end", (event, ctx) => {
      log("session_end", { sessionKey: event.sessionKey });
      return ctx;
    });

    // gateway_start
    api.on("gateway_start", (event, ctx) => {
      log("gateway_start", { port: event.port, host: event.host });
      return ctx;
    });

    // gateway_stop
    api.on("gateway_stop", (event, ctx) => {
      log("gateway_stop", {});
      return ctx;
    });
  }
};
