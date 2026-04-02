---
name: agent
description: Connect this Claude instance to the shared multi-agent chat channel for lightweight coordination between terminals
argument-hint: "<name> [message] | <name> read | <name> ask <question> | <name> clear"
---

# Multi-Agent Communication

This skill connects Claude instances to a shared file-based message bus.
No server or daemon required — just a file that all agents read and write on demand.

> **Note:** For production multi-agent systems, consider MCP (`claude mcp serve`) or the A2A protocol instead. This skill is for lightweight, casual coordination between terminals.

**Chat file location** (checked in order):
1. `AGENT_CHAT_FILE` env var (if set - use for cross-device via shared filesystem)
2. `$TEMP/agent-chat.md` (default, same-machine only)

## Signature

After parsing, print:
```
agent — <mode>
  Name: <agent-name>
  Chat: <resolved chat file path>

  Modes: <name> [msg] | <name> read | <name> ask <question> | <name> clear
```

## Usage

/agent <YourName>                     — register and check for messages
/agent <YourName> <message>           — register and send a message
/agent <YourName> read                — read the full chat history
/agent <YourName> ask <question>      — send a question and wait for a reply (poll once)
/agent <YourName> clear               — archive and reset the chat channel

---

## Behavior

Parse $ARGUMENTS:
- First word = your agent name (e.g. "Adam", "Benny")
- Remaining words = message, or a mode keyword (read / ask)

### Always on activation:
1. Read the chat file to get current context.
2. Announce yourself if this is the first time this session:
   Append: `**[{name}] {date} {time}** — joined the channel.`
3. Internalize the chat history silently — you now know what other agents have said.

### If a message was provided:
- Append the message to the chat file:
   ```
   **[{name}] YYYY-MM-DD HH:MM** — {message}
   ```
- Summarize in one line what you wrote and what you read from others (if anything).
- Verify the file ends with your message (read last line). If not, warn the user.

### If mode is "read":
- Print the full chat history to the user in a readable format.

### If mode is "ask":
- Append the question tagged with your name.
- Tell the user: "Message sent. Ask the other terminal to respond, then run `/agent {name} read` to see the reply."

### If mode is "clear":
- Copy the current chat file to `agent-chat-YYYY-MM-DD-HHMMSS.md` (same directory) as archive.
- Reset the chat file to the default header (see below).
- Confirm: "Chat archived and reset."

### General rules:
- Resolve chat file path: use `$AGENT_CHAT_FILE` if set, otherwise `$TEMP/agent-chat.md`
- Always use the exact format: `**[Name] YYYY-MM-DD HH:MM** -` for new messages
- Never overwrite the file - only append
- Keep messages concise
- If the chat file does not exist, create it with the header:
  ```
  # Agent Chat Channel
  <!-- Shared communication file for Claude instances -->
  <!-- Format: **[AgentName] YYYY-MM-DD HH:MM** - message -->

  ---

  ```

## Self-Refinement

This skill participates in the co-intelligence feedback loop. After completing
a task, if friction was observed (user corrections, workarounds, missing modes,
suboptimal output), suggest: "Want me to `/skillsmith agent` to refine this?"
and log the observation to `$PLUGIN_DATA/friction.md`. See
`references/self-refinement.md` for the full protocol.
