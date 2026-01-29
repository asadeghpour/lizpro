# MCP + Rancher Kubernetes Integration

This repository demonstrates a working MCP CLI setup using:
- Ollama
- Qwen 2.5 (1.5B)
- Rancher MCP server

## Features
- Connects MCP CLI to Rancher via stdio
- Exposes 34 Rancher management tools
- Interactive chat-based Kubernetes operations

## Prerequisites
- Ollama
- MCP CLI
- Rancher API access

## Usage

```bash
mcp-cli chat \
  --config-file server_config.json \
  --provider ollama \
  --model qwen2.5:1.5b
Then run:
/server
/tools


