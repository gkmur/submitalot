Check if the cached n8n workflow is up-to-date by comparing timestamps.

Use the n8n MCP `search_workflows` tool (lightweight, ~500 tokens) to get the current `updatedAt` timestamp for workflow ID: $ARGUMENTS (default: NUDfr0IQSRwTHm1F if no argument provided).

Then read the cached metadata from `.n8n-cache/workflows/[WORKFLOW_ID].meta.json` and compare:
- If the timestamps match: Report "Cache is current" with the last update time
- If n8n is newer: Report "Cache is STALE" and ask if user wants to refresh
- If cache doesn't exist: Report "No cache found" and offer to create one

Do NOT fetch the full workflow details - this is just a quick freshness check.
