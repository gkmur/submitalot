Refresh the n8n workflow cache for workflow ID: $ARGUMENTS (default: NUDfr0IQSRwTHm1F if no argument provided).

Steps:
1. Use `get_workflow_details` MCP tool to fetch the full workflow
2. Save the full workflow JSON to `.n8n-cache/workflows/[WORKFLOW_ID].json`
3. Update the metadata file `.n8n-cache/workflows/[WORKFLOW_ID].meta.json` with new `updatedAt` and `cachedAt` timestamps
4. Extract and save key nodes to `.n8n-cache/nodes/` for quick reference:
   - Information Extractor config
   - Extract Metadata config
   - Any other AI/LLM nodes
5. Report what was cached and the new timestamp

This is a FULL refresh - use `/n8n-sync` first to check if refresh is needed.
