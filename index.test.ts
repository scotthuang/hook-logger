import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock definePluginEntry to capture the plugin definition
const mockDefinePluginEntry = vi.fn((options) => ({
  id: options.id,
  name: options.name,
  description: options.description,
  configSchema: options.configSchema,
  register: options.register,
}));

vi.mock("openclaw/plugin-sdk/plugin-entry", () => ({
  definePluginEntry: (...args: unknown[]) => mockDefinePluginEntry(...args),
}));

// Mock other dependencies
vi.mock("node:fs", () => ({
  default: {
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
    readdirSync: vi.fn(() => []),
    statSync: vi.fn(() => ({ mtimeMs: Date.now() })),
    unlinkSync: vi.fn(),
    appendFileSync: vi.fn(),
  },
  existsSync: vi.fn(() => true),
  mkdirSync: vi.fn(),
  readdirSync: vi.fn(() => []),
  statSync: vi.fn(() => ({ mtimeMs: Date.now() })),
  unlinkSync: vi.fn(),
  appendFileSync: vi.fn(),
}));

vi.mock("node:path", () => ({
  default: {
    join: (...args: string[]) => args.join("/"),
    resolve: (...args: string[]) => args.join("/"),
  },
  join: (...args: string[]) => args.join("/"),
  resolve: (...args: string[]) => args.join("/"),
}));

vi.mock("node:os", () => ({
  default: {
    homedir: () => "/test/home",
  },
  homedir: () => "/test/home",
}));

describe("hook-logger", () => {
  let mockApi: any;
  let plugin: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset modules to get fresh import
    vi.resetModules();
    mockApi = {
      on: vi.fn((event: string, handler: Function) => {}),
    };
    // Import the plugin (which calls definePluginEntry)
    const module = await import("./index.ts");
    plugin = module.default;
  });

  it("should have correct plugin metadata", () => {
    expect(plugin.id).toBe("hook-logger");
    expect(plugin.name).toBe("Hook Logger");
    expect(plugin.description).toBe("Log all hook stages for debugging in OpenClaw");
    expect(typeof plugin.register).toBe("function");
  });

  it("should register all lifecycle hooks", async () => {
    plugin.register(mockApi);

    // Verify that api.on was called for each hook
    expect(mockApi.on).toHaveBeenCalled();

    // Get all registered hook names
    const registeredHooks = mockApi.on.mock.calls.map((call: any[]) => call[0]);

    // Agent turn hooks
    expect(registeredHooks).toContain("before_model_resolve");
    expect(registeredHooks).toContain("agent_turn_prepare");
    expect(registeredHooks).toContain("before_prompt_build");
    expect(registeredHooks).toContain("before_agent_run");
    expect(registeredHooks).toContain("before_agent_reply");
    expect(registeredHooks).toContain("model_call_started");
    expect(registeredHooks).toContain("model_call_ended");
    expect(registeredHooks).toContain("llm_input");
    expect(registeredHooks).toContain("llm_output");
    expect(registeredHooks).toContain("before_agent_finalize");
    expect(registeredHooks).toContain("agent_end");

    // Compaction hooks
    expect(registeredHooks).toContain("before_compaction");
    expect(registeredHooks).toContain("after_compaction");
    expect(registeredHooks).toContain("before_reset");

    // Message hooks
    expect(registeredHooks).toContain("inbound_claim");
    expect(registeredHooks).toContain("message_received");
    expect(registeredHooks).toContain("message_sending");
    expect(registeredHooks).toContain("message_sent");
    expect(registeredHooks).toContain("before_dispatch");
    expect(registeredHooks).toContain("reply_dispatch");

    // Tool hooks
    expect(registeredHooks).toContain("before_tool_call");
    expect(registeredHooks).toContain("after_tool_call");
    expect(registeredHooks).toContain("tool_result_persist");
    expect(registeredHooks).toContain("before_message_write");

    // Session hooks
    expect(registeredHooks).toContain("session_start");
    expect(registeredHooks).toContain("session_end");

    // Subagent hooks
    expect(registeredHooks).toContain("subagent_spawning");
    expect(registeredHooks).toContain("subagent_delivery_target");
    expect(registeredHooks).toContain("subagent_spawned");
    expect(registeredHooks).toContain("subagent_ended");

    // Lifecycle hooks
    expect(registeredHooks).toContain("gateway_start");
    expect(registeredHooks).toContain("gateway_stop");

    // Other hooks
    expect(registeredHooks).toContain("heartbeat_prompt_contribution");
    expect(registeredHooks).toContain("cron_changed");
    expect(registeredHooks).toContain("before_install");

    // Deprecated hooks should NOT be registered
    expect(registeredHooks).not.toContain("before_agent_start");
    expect(registeredHooks).not.toContain("deactivate");
  });

  it("should call safeLog via hook handlers without throwing", async () => {
    plugin.register(mockApi);

    // Get a few hook handlers and test they don't throw
    const hookCalls = mockApi.on.mock.calls;

    // Test before_model_resolve handler
    const beforeModelResolveCall = hookCalls.find(
      (call: any[]) => call[0] === "before_model_resolve"
    );
    expect(beforeModelResolveCall).toBeDefined();
    const handler = beforeModelResolveCall[1];
    expect(() => handler({ prompt: "test" })).not.toThrow();

    // Test agent_end handler
    const agentEndCall = hookCalls.find(
      (call: any[]) => call[0] === "agent_end"
    );
    expect(agentEndCall).toBeDefined();
    const agentEndHandler = agentEndCall[1];
    expect(() => agentEndHandler({ success: true, messages: [] })).not.toThrow();

    // Test gateway_start handler
    const gatewayStartCall = hookCalls.find(
      (call: any[]) => call[0] === "gateway_start"
    );
    expect(gatewayStartCall).toBeDefined();
    const gatewayStartHandler = gatewayStartCall[1];
    expect(() => gatewayStartHandler({ port: 3000 })).not.toThrow();
  });
});
