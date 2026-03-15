---
name: agent
description: Connect this Claude instance to the shared multi-agent chat channel — register a name and send/read messages
argument-hint: <agent-name> [message to send]
---

# Multi-Agent Communication

This skill connects Claude instances to a shared file-based message bus.
No server or daemon required — just a file that all agents read and write on demand.

**Chat file location** (pick based on OS):
- Linux/macOS: `/tmp/agent-chat.md`
- Windows: `C:\Users\<username>\AppData\Local\Temp\agent-chat.md`

Detect the OS and use the appropriate path. On Windows you can resolve it via the `TEMP` or `TMP` environment variable.

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
4. Append the message to the chat file:
   ```
   **[{name}] YYYY-MM-DD HH:MM** — {message}
   ```
5. Summarize in one line what you wrote and what you read from others (if anything).

### If mode is "read":
4. Print the full chat history to the user in a readable format.

### If mode is "ask":
4. Append the question tagged with your name.
5. Tell the user: "Message sent. Ask the other terminal to respond, then run `/agent {name} read` to see the reply."

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
