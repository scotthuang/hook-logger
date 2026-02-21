import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock dependencies before importing the plugin
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
  
  beforeEach(() => {
    vi.clearAllMocks();
    mockApi = {
      on: vi.fn((event: string, handler: Function) => {}),
    };
  });

  it("should have correct plugin metadata", async () => {
    const plugin = (await import("./index.ts")).default;
    
    expect(plugin.id).toBe("hook-logger");
    expect(plugin.name).toBe("hook-logger");
    expect(plugin.description).toBe("Log all hook stages for debugging");
    expect(typeof plugin.register).toBe("function");
  });

  it("should register all hook handlers", async () => {
    const plugin = (await import("./index.ts")).default;
    plugin.register(mockApi);
    
    // Verify that api.on was called for each hook
    expect(mockApi.on).toHaveBeenCalled();
    
    // Check that hooks are registered
    const registeredHooks = mockApi.on.mock.calls.map((call: any[]) => call[0]);
    
    expect(registeredHooks).toContain("before_model_resolve");
    expect(registeredHooks).toContain("before_prompt_build");
    expect(registeredHooks).toContain("before_agent_start");
    expect(registeredHooks).toContain("llm_input");
    expect(registeredHooks).toContain("llm_output");
    expect(registeredHooks).toContain("agent_end");
    expect(registeredHooks).toContain("before_compaction");
    expect(registeredHooks).toContain("after_compaction");
    expect(registeredHooks).toContain("before_reset");
    expect(registeredHooks).toContain("message_received");
    expect(registeredHooks).toContain("message_sending");
    expect(registeredHooks).toContain("message_sent");
    expect(registeredHooks).toContain("before_tool_call");
    expect(registeredHooks).toContain("after_tool_call");
    expect(registeredHooks).toContain("tool_result_persist");
    expect(registeredHooks).toContain("before_message_write");
    expect(registeredHooks).toContain("session_start");
    expect(registeredHooks).toContain("session_end");
    expect(registeredHooks).toContain("gateway_start");
    expect(registeredHooks).toContain("gateway_stop");
  });

  it("should return context in hook handlers", async () => {
    const plugin = (await import("./index.ts")).default;
    plugin.register(mockApi);
    
    // Get the before_model_resolve handler
    const beforeModelResolveCall = mockApi.on.mock.calls.find(
      (call: any[]) => call[0] === "before_model_resolve"
    );
    const handler = beforeModelResolveCall[1];
    
    const mockEvent = { prompt: "test prompt" };
    const mockCtx = { sessionKey: "test-session" };
    const result = handler(mockEvent, mockCtx);
    
    // Handler should return the context
    expect(result).toBe(mockCtx);
  });
});
