# @scotthuang/hook-logger

OpenClaw plugin for logging all hook stages for debugging.

## Installation

```bash
openclaw plugins install @scotthuang/hook-logger
```

Then restart the Gateway:

```bash
openclaw gateway restart
```

## Features

Logs the following hooks:

- `before_model_resolve` - Before model resolution
- `before_prompt_build` - Before prompt construction
- `before_agent_start` - Before agent starts
- `llm_input` - LLM input (model, provider, prompt)
- `llm_output` - LLM output (texts, stop reason)
- `agent_end` - Agent end (success, error, duration)
- `before_compaction` - Before message compaction
- `after_compaction` - After message compaction
- `before_reset` - Before session reset
- `message_received` - Message received
- `message_sending` - Message sending
- `message_sent` - Message sent
- `before_tool_call` - Before tool call
- `after_tool_call` - After tool call
- `tool_result_persist` - Tool result persisted
- `before_message_write` - Before message write
- `session_start` - Session start
- `session_end` - Session end
- `gateway_start` - Gateway start
- `gateway_stop` - Gateway stop

## Log Location

Logs are saved to: `~/.openclaw/workspace/logs/hook-logger/`

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test
```

## License

MIT
