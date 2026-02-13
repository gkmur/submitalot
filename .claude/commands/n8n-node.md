Read and analyze a specific n8n node from the local cache.

Node name: $ARGUMENTS

Look for the node in:
1. `.n8n-cache/nodes/[node-name].json` (extracted node files)
2. If not found, search `.n8n-cache/workflows/*.json` for the node

Return the node configuration and any analysis/recommendations.

Do NOT call the n8n MCP tools - work only from cached data. If cache is missing, suggest running `/n8n-refresh` first.
