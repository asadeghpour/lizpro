import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

// 1. Configuration
const RANCHER_URL = process.env.RANCHER_URL || "https://prime.elemental.org:8443";
const RANCHER_TOKEN = process.env.RANCHER_TOKEN || "token-cwlzt:bjndg8qxj88gdcnw77rvm4ghmqtkz6z25bj4w54nflh4d4ftpxkjl7";

interface RancherResponse {
  data?: any[];
  items?: any[];
  [key: string]: any;
}

const server = new Server(
  { name: "rancher-server", version: "1.6.0" },
  { capabilities: { tools: {} } }
);

/**
 * Tool Definitions
 * Restoring the full explicit list so you see 37 tools in /tools
 */
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "rancher_list_namespaces",
      description: "List all Kubernetes namespaces in a specific cluster (use 'local' for the local cluster)",
      inputSchema: {
        type: "object",
        properties: { clusterId: { type: "string", description: "The cluster ID" } },
        required: ["clusterId"]
      }
    },
    {
      name: "rancher_list_pvcs",
      description: "List Persistent Volume Claims (PVCs) in a namespace",
      inputSchema: {
        type: "object",
        properties: {
          clusterId: { type: "string" },
          namespace: { type: "string", default: "default" }
        },
        required: ["clusterId"]
      }
    },
    {
      name: "rancher_get_resource",
      description: "Fetch a single v3 resource (cluster, node, project) by type and ID",
      inputSchema: {
        type: "object",
        properties: { resourceType: { type: "string" }, resourceId: { type: "string" } },
        required: ["resourceType", "resourceId"]
      }
    },
    {
      name: "rancher_execute_action",
      description: "Execute a POST action (cordon, redeploy) on a v3 resource",
      inputSchema: {
        type: "object",
        properties: { resourceType: { type: "string" }, resourceId: { type: "string" }, action: { type: "string" }, data: { type: "object" } },
        required: ["resourceType", "resourceId", "action"]
      }
    },
    // Explicitly listing all 32 management tools below
    { name: "rancher_list_clusters", description: "List all clusters", inputSchema: { type: "object" } },
    { name: "rancher_list_nodes", description: "List all nodes", inputSchema: { type: "object", properties: { clusterId: { type: "string" } } } },
    { name: "rancher_list_projects", description: "List all projects", inputSchema: { type: "object" } },
    { name: "rancher_list_users", description: "List all users", inputSchema: { type: "object" } },
    { name: "rancher_list_tokens", description: "List API tokens", inputSchema: { type: "object" } },
    { name: "rancher_list_fleet_workspaces", description: "List Fleet Workspaces", inputSchema: { type: "object" } },
    { name: "rancher_list_psat", description: "List Pod Security Templates", inputSchema: { type: "object" } },
    { name: "rancher_list_settings", description: "List global settings", inputSchema: { type: "object" } },
    { name: "rancher_list_node_pools", description: "List all node pools", inputSchema: { type: "object" } },
    { name: "rancher_list_features", description: "List feature flags", inputSchema: { type: "object" } },
    { name: "rancher_list_auth_configs", description: "List auth configs", inputSchema: { type: "object" } },
    { name: "rancher_list_cloud_credentials", description: "List cloud credentials", inputSchema: { type: "object" } },
    { name: "rancher_list_cluster_registration_tokens", description: "List registration tokens", inputSchema: { type: "object" } },
    { name: "rancher_list_cluster_role_template_bindings", description: "List CRTBs", inputSchema: { type: "object" } },
    { name: "rancher_list_global_role_bindings", description: "List GRBs", inputSchema: { type: "object" } },
    { name: "rancher_list_global_roles", description: "List Global Roles", inputSchema: { type: "object" } },
    { name: "rancher_list_groups", description: "List groups", inputSchema: { type: "object" } },
    { name: "rancher_list_node_drivers", description: "List node drivers", inputSchema: { type: "object" } },
    { name: "rancher_list_project_network_policies", description: "List network policies", inputSchema: { type: "object" } },
    { name: "rancher_list_project_role_template_bindings", description: "List PRTBs", inputSchema: { type: "object" } },
    { name: "rancher_list_role_templates", description: "List role templates", inputSchema: { type: "object" } },
    { name: "rancher_list_saml_tokens", description: "List saml tokens", inputSchema: { type: "object" } },
    { name: "rancher_list_preferences", description: "List user preferences", inputSchema: { type: "object" } },
    { name: "rancher_list_principals", description: "List principals", inputSchema: { type: "object" } },
    { name: "rancher_list_notifications", description: "List rancher user notifications", inputSchema: { type: "object" } },
    { name: "rancher_list_dynamic_schemas", description: "List dynamic schemas", inputSchema: { type: "object" } },
    { name: "rancher_list_compose_configs", description: "List compose configs", inputSchema: { type: "object" } },
    { name: "rancher_list_ldap_configs", description: "List ldap configs", inputSchema: { type: "object" } },
    { name: "rancher_list_management_secrets", description: "List management secrets", inputSchema: { type: "object" } },
    { name: "rancher_list_oidc_clients", description: "List oidc clients", inputSchema: { type: "object" } }
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const pathMap: Record<string, string> = {
    "rancher_list_clusters": "/v3/clusters",
    "rancher_list_nodes": "/v3/nodes",
    "rancher_list_projects": "/v3/projects",
    "rancher_list_users": "/v3/users",
    "rancher_list_tokens": "/v3/tokens",
    "rancher_list_settings": "/v3/settings",
    "rancher_list_fleet_workspaces": "/v3/fleetworkspaces",
    "rancher_list_psat": "/v3/podsecurityadmissionconfigurationtemplates",
  };

  try {
    let url = "";
    let method = "GET";

    if (name === "rancher_list_namespaces") {
      url = `${RANCHER_URL}/k8s/clusters/${args?.clusterId}/api/v1/namespaces`;
    } else if (name === "rancher_list_pvcs") {
      url = `${RANCHER_URL}/k8s/clusters/${args?.clusterId}/api/v1/namespaces/${args?.namespace || 'default'}/persistentvolumeclaims`;
    } else if (name === "rancher_execute_action") {
      url = `${RANCHER_URL}/v3/${args?.resourceType}/${args?.resourceId}?action=${args?.action}`;
      method = "POST";
    } else if (name === "rancher_get_resource") {
      url = `${RANCHER_URL}/v3/${args?.resourceType}/${args?.resourceId}`;
    } else {
      const path = pathMap[name] || `/v3/${name.replace('rancher_list_', '').replace(/_/g, '')}`;
      url = `${RANCHER_URL}${path}`;
      if (name === "rancher_list_nodes" && args?.clusterId) url += `?clusterId=${args.clusterId}`;
    }

    let response = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${RANCHER_TOKEN}`, "Accept": "application/json", "Content-Type": "application/json" },
      body: method === "POST" ? JSON.stringify(args?.data || {}) : undefined
    });

    // Fallback Logic: If /k8s/ schema is not found, try the direct /v1/ resource path
    if (!response.ok && response.status === 404 && (name === "rancher_list_namespaces" || name === "rancher_list_pvcs")) {
        const fallbackPath = name === "rancher_list_namespaces" ? "/v1/namespaces" : `/v1/persistentvolumeclaims`;
        url = `${RANCHER_URL}${fallbackPath}`;
        response = await fetch(url, { headers: { Authorization: `Bearer ${RANCHER_TOKEN}`, "Accept": "application/json" } });
    }

    if (!response.ok) {
      const err = await response.text();
      return { content: [{ type: "text", text: `Rancher Error (${response.status}): ${err}` }], isError: true };
    }

    const result = (await response.json()) as RancherResponse;
    const output = result.items || result.data || result;
    return { content: [{ type: "text", text: JSON.stringify(output, null, 2) }] };
  } catch (error) {
    return { content: [{ type: "text", text: `Failed: ${String(error)}` }], isError: true };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
