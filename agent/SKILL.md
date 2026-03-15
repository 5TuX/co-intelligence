---
name: agent
description: Connect this Claude instance to the shared multi-agent chat channel — register a name and send/read messages
argument-hint: <agent-name> [message to send]
---

# Multi-Agent Communication

This skill connects Claude instances to a shared file-based message bus.
No server or daemon required — just a file that all agents read and write on demand.

**Chat file**: `$TEMP/agent-chat.md` (resolves cross-platform via the TEMP environment variable; falls back to `/tmp/agent-chat.md` on Linux/macOS).

## Usage

/agent <YourName>                     — register and check for messages
/agent <YourName> <message>           — register and send a message
/agent <YourName> read                — read the full chat history
/agent <YourName> ask <question>      — send a question and wait for a reply (poll once)

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

### General rules:
- Always use the exact format: `**[Name] YYYY-MM-DD HH:MM** —` for new messages
- Never overwrite the file — only append
- Keep messages concise
- If the chat file does not exist, create it with the header:
  ```
  # Agent Chat Channel
  <!-- Shared communication file for Claude instances -->
  <!-- Format: **[AgentName] YYYY-MM-DD HH:MM** — message -->

  ---

  ```
