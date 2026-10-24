const BASE = "https://api.omnara.com/v1";
const TOKEN = process.env.OMNARA_TOKEN!;
const ORG = process.env.OMNARA_ORG!;
const PROJECT = process.env.OMNARA_PROJECT!;

const headers = {
  Authorization: `Bearer ${TOKEN}`,
  "Content-Type": "application/json",
};

function agentConfig(instruction: string) {
  return [
    "version: v1",
    "instruction: |",
    ...instruction.split("\n").map((l) => "  " + l),
    "model:",
    "  provider_config: omnara-openrouter",
    "  name: xiaomi/mimo-v2.6-pro",
  ].join("\n");
}

export async function launchAgent(
  instruction: string,
  message: string,
  name: string
): Promise<{ agentId: string; reply: string }> {
  const res = await fetch(`${BASE}/orgs/${ORG}/projects/${PROJECT}/agents`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      config_source: { source: agentConfig(instruction), source_format: "yaml" },
      name,
      message,
    }),
  });
  if (!res.ok) throw new Error(`launch failed: ${res.status} ${await res.text()}`);
  const data = await res.json();
  const agentId: string = data.id ?? data.agent?.id;
  const reply = await waitForReply(agentId, 0);
  return { agentId, reply };
}

export async function sendMessage(agentId: string, message: string): Promise<string> {
  const before = await latestOutputSequence(agentId);
  const res = await fetch(
    `${BASE}/orgs/${ORG}/projects/${PROJECT}/agents/${agentId}/inputs`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({ content_blocks: [{ type: "text", text: message }] }),
    }
  );
  if (!res.ok) throw new Error(`input failed: ${res.status} ${await res.text()}`);
  return waitForReply(agentId, before);
}

async function latestOutputSequence(agentId: string): Promise<number> {
  const turns = await getTurns(agentId);
  let max = 0;
  for (const t of turns) {
    const e = t.latest_event;
    if (e?.event_kind === "model_output" && e.sequence > max) max = e.sequence;
  }
  return max;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getTurns(agentId: string): Promise<any[]> {
  const res = await fetch(
    `${BASE}/orgs/${ORG}/projects/${PROJECT}/agents/${agentId}/turns`,
    { headers, cache: "no-store" }
  );
  if (!res.ok) return [];
  const data = await res.json();
  return data.data ?? [];
}

async function waitForReply(agentId: string, afterSequence: number): Promise<string> {
  const deadline = Date.now() + 55_000;
  while (Date.now() < deadline) {
    const turns = await getTurns(agentId);
    for (const t of turns) {
      const e = t.latest_event;
      if (
        e?.event_kind === "model_output" &&
        e.sequence > afterSequence &&
        e.stop_reason === "end_turn"
      ) {
        const texts = (e.content_blocks ?? [])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((b: any) => b.type === "text")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((b: any) => b.text);
        if (texts.length) return texts.join("\n");
      }
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("agent reply timed out");
}
