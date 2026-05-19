import type { ChatMessage } from "@rp/st-client";
import type { Character, Message, Scenario, Session, World } from "@rp/shared";
import { llm } from "../llm.js";
import { describeImage } from "./vision.js";

const GM_SYSTEM = `You are the Game Master (GM) for a collaborative roleplay session.

Responsibilities:
- Narrate scenes vividly but concisely (1-3 short paragraphs).
- Voice NPCs not yet given to PC-AIs.
- Adjudicate fairly using the world's lore and the active scenario.
- Never speak or decide for the human player's character.
- When a check is needed, ask the player to roll or state a number 1-20.
- End each narration with a clear hook or question for the players.

Output plain prose only. Do not include meta commentary or stage directions in brackets.`;

export interface GmTurnInput {
  session: Session;
  scenario: Scenario;
  world: World | undefined;
  characters: Character[];
  recentMessages: Message[];
  /** The latest player message that triggered this turn. */
  trigger: Message;
  /**
   * Optional image attached to the trigger. Must be a `data:` URL or
   * public http(s) URL. The vision model is called separately and its
   * caption is injected into the GM context as a system note.
   */
  triggerImageUrl?: string;
}

/**
 * Single GM turn. v1 = plain chat completion. v2 will add tool-use
 * (describe_scene / roll / update_state / npc_speak / advance_time).
 */
export async function runGmTurn(input: GmTurnInput): Promise<string> {
  const { scenario, world, characters, recentMessages, trigger, triggerImageUrl } = input;

  let imageNote: string | undefined;
  if (triggerImageUrl) {
    try {
      const caption = await describeImage(triggerImageUrl, trigger.content);
      imageNote = `The player attached an image. Vision model description: ${caption}`;
    } catch (e) {
      imageNote = `The player attached an image, but vision model failed: ${String(e)}`;
    }
  }

  const loreBlock = world
    ? `World: ${world.name}\nSummary: ${world.summary}\nLore:\n${world.lore
        .map((l) => `- (${l.keys.join(", ")}) ${l.content}`)
        .join("\n")}`
    : "World: (none)";

  const charBlock = characters
    .map((c) => `- ${c.name} [${c.kind}] (${c.lang}): ${c.persona}`)
    .join("\n");

  const messages: ChatMessage[] = [
    { role: "system", content: GM_SYSTEM },
    {
      role: "system",
      content: `${loreBlock}\n\nScenario: ${scenario.title}\nHook: ${scenario.hook}\nOpening: ${scenario.openingScene}\n\nCast:\n${charBlock}`,
    },
    ...(imageNote ? [{ role: "system", content: imageNote } as ChatMessage] : []),
    ...recentMessages.map<ChatMessage>((m) => ({
      role: m.role === "gm" ? "assistant" : "user",
      name: m.characterId ? characters.find((c) => c.id === m.characterId)?.name : undefined,
      content: m.content,
    })),
    {
      role: "user",
      name: trigger.characterId
        ? characters.find((c) => c.id === trigger.characterId)?.name
        : undefined,
      content: trigger.content,
    },
  ];

  const { content } = await llm.chat({
    model: input.session.gmModel,
    messages,
    temperature: 0.9,
    max_tokens: 512,
  });
  return content.trim();
}
