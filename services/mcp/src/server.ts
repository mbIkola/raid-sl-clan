import dotenv from 'dotenv';
import { FastMCP } from 'fastmcp';

dotenv.config();

const server = new FastMCP({
  name: "@raid/mcp",
  version: "0.0.1"
});

server.addTool({
    name: "ping",
    description: "Ping the server",
    execute: async () => "pong"
});

server.start({
  transportType: "httpStream",
  httpStream: {
    port: Number(process.env.MCP_PORT || 8080),
    stateless: true
  }
});
