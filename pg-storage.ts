import { db } from "./db";
import { IStorage } from "./storage";
import { eq, desc, and } from "drizzle-orm";
import { 
  portfolioItems, blogPosts, messages, agents, apiKeys, agentIntegrations,
  apiUsage, tixaeApiEndpoints, tixaeAgentTemplates
} from "@shared/schema";
import { 
  PortfolioItem, BlogPost, Message, Agent, ApiKey, AgentIntegration, ApiUsage,
  TixaeApiEndpoint, TixaeAgentTemplate,
  InsertPortfolioItem, InsertBlogPost, InsertMessage, InsertAgent, InsertApiKey, 
  InsertAgentIntegration, InsertApiUsage, InsertTixaeApiEndpoint, InsertTixaeAgentTemplate
} from "@shared/schema";

export class PgStorage implements IStorage {
  // Portfolio
  async getPortfolioItems(): Promise<PortfolioItem[]> {
    return await db.select().from(portfolioItems);
  }

  async getPortfolioItem(id: number): Promise<PortfolioItem | undefined> {
    const items = await db.select().from(portfolioItems).where(eq(portfolioItems.id, id));
    return items.length > 0 ? items[0] : undefined;
  }

  async createPortfolioItem(item: InsertPortfolioItem): Promise<PortfolioItem> {
    const result = await db.insert(portfolioItems).values(item).returning();
    return result[0];
  }

  // Blog
  async getBlogPosts(): Promise<BlogPost[]> {
    return await db.select().from(blogPosts).orderBy(desc(blogPosts.publishDate));
  }

  async getBlogPost(id: number): Promise<BlogPost | undefined> {
    const posts = await db.select().from(blogPosts).where(eq(blogPosts.id, id));
    return posts.length > 0 ? posts[0] : undefined;
  }

  async createBlogPost(post: InsertBlogPost): Promise<BlogPost> {
    const result = await db.insert(blogPosts).values(post).returning();
    return result[0];
  }

  // Messages
  async createMessage(message: InsertMessage): Promise<Message> {
    const result = await db.insert(messages).values(message).returning();
    return result[0];
  }

  // Agents
  async createAgent(agent: InsertAgent): Promise<Agent> {
    const result = await db.insert(agents).values(agent).returning();
    return result[0];
  }

  async getAgentById(agentId: string): Promise<Agent | undefined> {
    const items = await db.select().from(agents).where(eq(agents.agentId, agentId));
    return items.length > 0 ? items[0] : undefined;
  }

  async getAgentsByUserId(userId: string): Promise<Agent[]> {
    return await db.select().from(agents).where(eq(agents.userId, userId));
  }

  async updateAgentStatus(agentId: string, status: string): Promise<Agent | undefined> {
    const result = await db
      .update(agents)
      .set({ 
        status: status,
        updatedAt: new Date()
      })
      .where(eq(agents.agentId, agentId))
      .returning();
    
    return result.length > 0 ? result[0] : undefined;
  }

  // API Keys
  async createApiKey(apiKey: InsertApiKey): Promise<ApiKey> {
    const result = await db.insert(apiKeys).values(apiKey).returning();
    return result[0];
  }

  async getApiKeyById(id: number): Promise<ApiKey | undefined> {
    const keys = await db.select().from(apiKeys).where(eq(apiKeys.id, id));
    return keys.length > 0 ? keys[0] : undefined;
  }

  async getApiKeysByUserId(userId: string): Promise<ApiKey[]> {
    return await db.select().from(apiKeys).where(eq(apiKeys.userId, userId));
  }

  async validateApiKey(key: string): Promise<ApiKey | undefined> {
    const keys = await db
      .select()
      .from(apiKeys)
      .where(and(
        eq(apiKeys.key, key),
        eq(apiKeys.active, true)
      ));
      
    return keys.length > 0 ? keys[0] : undefined;
  }

  async deactivateApiKey(id: number): Promise<ApiKey | undefined> {
    const result = await db
      .update(apiKeys)
      .set({ active: false })
      .where(eq(apiKeys.id, id))
      .returning();
    
    return result.length > 0 ? result[0] : undefined;
  }

  async updateApiKeyLastUsed(id: number): Promise<void> {
    await db
      .update(apiKeys)
      .set({ lastUsed: new Date() })
      .where(eq(apiKeys.id, id));
  }

  // Agent Integrations
  async createAgentIntegration(integration: InsertAgentIntegration): Promise<AgentIntegration> {
    const result = await db.insert(agentIntegrations).values(integration).returning();
    return result[0];
  }

  async getIntegrationsByAgentId(agentId: string): Promise<AgentIntegration[]> {
    return await db
      .select()
      .from(agentIntegrations)
      .where(eq(agentIntegrations.agentId, agentId));
  }

  async getIntegrationsByApiKeyId(apiKeyId: number): Promise<AgentIntegration[]> {
    return await db
      .select()
      .from(agentIntegrations)
      .where(eq(agentIntegrations.apiKeyId, apiKeyId));
  }

  async deactivateIntegration(id: number): Promise<AgentIntegration | undefined> {
    const result = await db
      .update(agentIntegrations)
      .set({ 
        active: false,
        updatedAt: new Date()
      })
      .where(eq(agentIntegrations.id, id))
      .returning();
    
    return result.length > 0 ? result[0] : undefined;
  }

  // API Usage
  async recordApiUsage(usage: InsertApiUsage): Promise<ApiUsage> {
    const result = await db.insert(apiUsage).values(usage).returning();
    return result[0];
  }

  async getApiUsageByKeyId(apiKeyId: number): Promise<ApiUsage[]> {
    return await db
      .select()
      .from(apiUsage)
      .where(eq(apiUsage.apiKeyId, apiKeyId));
  }

  // TIXAE API Documentation
  async getTixaeApiEndpoints(): Promise<TixaeApiEndpoint[]> {
    return await db.select().from(tixaeApiEndpoints);
  }

  async getTixaeApiEndpoint(id: number): Promise<TixaeApiEndpoint | undefined> {
    const endpoints = await db
      .select()
      .from(tixaeApiEndpoints)
      .where(eq(tixaeApiEndpoints.id, id));
      
    return endpoints.length > 0 ? endpoints[0] : undefined;
  }

  async getTixaeApiEndpointByName(name: string): Promise<TixaeApiEndpoint | undefined> {
    const endpoints = await db
      .select()
      .from(tixaeApiEndpoints)
      .where(eq(tixaeApiEndpoints.name, name));
      
    return endpoints.length > 0 ? endpoints[0] : undefined;
  }

  async createTixaeApiEndpoint(endpoint: InsertTixaeApiEndpoint): Promise<TixaeApiEndpoint> {
    const result = await db.insert(tixaeApiEndpoints).values(endpoint).returning();
    return result[0];
  }

  // TIXAE Agent Templates
  async getTixaeAgentTemplates(): Promise<TixaeAgentTemplate[]> {
    return await db.select().from(tixaeAgentTemplates);
  }

  async getTixaeAgentTemplate(id: number): Promise<TixaeAgentTemplate | undefined> {
    const templates = await db
      .select()
      .from(tixaeAgentTemplates)
      .where(eq(tixaeAgentTemplates.id, id));
      
    return templates.length > 0 ? templates[0] : undefined;
  }

  async getTixaeAgentTemplateByName(name: string): Promise<TixaeAgentTemplate | undefined> {
    const templates = await db
      .select()
      .from(tixaeAgentTemplates)
      .where(eq(tixaeAgentTemplates.name, name));
      
    return templates.length > 0 ? templates[0] : undefined;
  }

  async createTixaeAgentTemplate(template: InsertTixaeAgentTemplate): Promise<TixaeAgentTemplate> {
    const result = await db.insert(tixaeAgentTemplates).values(template).returning();
    return result[0];
  }
}
