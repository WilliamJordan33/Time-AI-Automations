import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";
import { log } from "./vite";

/**
 * Middleware to validate API key from Authorization header
 * Adds apiKey object to request if valid
 */
export const validateApiKey = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authorization header missing or invalid" });
  }
  
  const apiKey = authHeader.substring(7); // Remove "Bearer " prefix
  
  try {
    const validatedKey = await storage.validateApiKey(apiKey);
    
    if (!validatedKey) {
      return res.status(403).json({ error: "Invalid or inactive API key" });
    }
    
    // Add the validated key to the request for later use
    (req as any).apiKey = validatedKey;
    next();
  } catch (error) {
    log(`API key validation error: ${error}`, "middleware");
    return res.status(500).json({ error: "Error validating API key" });
  }
};

/**
 * Middleware to track API usage
 */
export const trackApiUsage = async (req: Request, res: Response, next: NextFunction) => {
  const apiKey = (req as any).apiKey;
  if (!apiKey) {
    return next(); // Skip if no API key (should never happen after validateApiKey)
  }
  
  // Store the original end method to intercept it later
  const originalEnd = res.end;
  
  // Override the end method to capture the status code
  res.end = function(chunk?: any, encoding?: any, callback?: any) {
    // Restore the original end method to avoid infinite recursion
    res.end = originalEnd;
    
    // Track the API usage asynchronously (don't await)
    storage.recordApiUsage({
      apiKeyId: apiKey.id,
      endpoint: req.originalUrl,
      statusCode: res.statusCode.toString(),
      requestPayload: req.method === "GET" ? null : req.body
    }).catch(err => {
      log(`Failed to record API usage: ${err}`, "middleware");
    });
    
    // Call the original end method
    return res.end(chunk, encoding, callback);
  };
  
  next();
};

/**
 * Middleware to verify domain origin for integrations
 */
export const verifyDomain = async (req: Request, res: Response, next: NextFunction) => {
  const apiKey = (req as any).apiKey;
  if (!apiKey) {
    return next(); // Skip if no API key (should never happen after validateApiKey)
  }
  
  const origin = req.headers.origin;
  const referer = req.headers.referer;
  
  // Skip domain verification for specific routes like API key management
  if (req.path.startsWith("/api/admin") || req.path === "/api/v1/keys/verify") {
    return next();
  }
  
  try {
    // Get integrations for this API key
    const integrations = await storage.getIntegrationsByApiKeyId(apiKey.id);
    
    if (integrations.length === 0) {
      return res.status(403).json({ error: "No integrations configured for this API key" });
    }
    
    // Check if the origin or referer matches any of the allowed domains
    let domainMatch = false;
    const source = origin || referer;
    
    if (source) {
      const url = new URL(source);
      const hostname = url.hostname;
      
      domainMatch = integrations.some(integration => {
        // Allow exact domain match or subdomain match (*.example.com)
        return integration.domain === hostname ||
               (integration.domain.startsWith("*.") && 
                hostname.endsWith(integration.domain.substring(1)));
      });
    }
    
    if (!domainMatch) {
      log(`Domain verification failed: ${source}`, "middleware");
      return res.status(403).json({ 
        error: "This domain is not authorized to use this API key" 
      });
    }
    
    next();
  } catch (error) {
    log(`Domain verification error: ${error}`, "middleware");
    return res.status(500).json({ error: "Error verifying domain" });
  }
};
