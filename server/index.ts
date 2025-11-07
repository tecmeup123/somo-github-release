import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { setupVite, serveStatic, log } from "./vite";
import rateLimit from "express-rate-limit";
import cors from "cors";

// Feature modules
import { pixelStorage } from "./features/pixels/storage";
import { registerUserRoutes } from "./features/users/routes";
import { registerPixelRoutes } from "./features/pixels/routes";
import { registerClusterRoutes } from "./features/clusters/routes";
import { registerTransactionRoutes } from "./features/transactions/routes";
import { registerStatsRoutes } from "./features/stats/routes";
import { registerAdminRoutes } from "./features/admin/routes";
import { registerSyncRoutes } from "./features/sync/routes";
import { registerGovernanceRoutes } from "./features/governance/routes";
import { registerFeedbackRoutes, ensureFeedbackTable } from "./features/feedback/routes";
import { clients } from "./features/shared/websocket";

const app = express();

// Trust first proxy for accurate client IP detection in production environments
// Setting to 1 is more secure than 'true' which trusts all proxies
// Required for rate limiting and CORS to work correctly behind reverse proxies
app.set('trust proxy', 1);

// Security Fix M-01: CORS configuration to prevent unauthorized cross-origin access
const allowedOrigins = [
  process.env.FRONTEND_URL, // Production URL (set via environment variable)
  process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : null,
  process.env.NODE_ENV === 'development' ? 'http://127.0.0.1:5000' : null,
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Parse origin URL to securely extract hostname
    let originUrl: URL;
    try {
      originUrl = new URL(origin);
    } catch (e) {
      // Invalid URL format - reject (log for debugging)
      if (process.env.NODE_ENV === 'development') {
        console.log('[CORS Debug] Rejected invalid origin:', origin);
      }
      return callback(new Error('Invalid origin URL'));
    }
    
    // Check if origin matches any allowed pattern
    const isAllowed = allowedOrigins.some(allowed => {
      try {
        const allowedUrl = new URL(allowed.replace('*', 'placeholder'));
        
        // Must match protocol (http/https)
        if (originUrl.protocol !== allowedUrl.protocol) {
          return false;
        }
        
        if (allowed.includes('*')) {
          // Wildcard subdomain matching - check if hostname ends with domain suffix
          // Example: "https://*.example.com" matches "https://app.example.com"
          const domainSuffix = allowedUrl.hostname.replace('placeholder', '');
          
          // The suffix will be ".example.com" (with leading dot)
          // Origin hostname must end with the suffix and have subdomain before it
          if (!domainSuffix.startsWith('.')) {
            // If no leading dot in suffix, this is a malformed pattern
            return false;
          }
          
          return originUrl.hostname.endsWith(domainSuffix) &&
                 originUrl.hostname.length > domainSuffix.length;
        }
        
        // Exact match (no wildcard)
        return originUrl.hostname === allowedUrl.hostname;
      } catch (e) {
        return false;
      }
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      // Log rejected origins in development for debugging
      if (process.env.NODE_ENV === 'development') {
        console.log('[CORS Debug] Rejected origin:', origin);
      }
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Security Fix M-05: Request body size limits to prevent memory exhaustion
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

// Security Fix H-01: Rate limiting to prevent DoS attacks
// General API rate limiting - 100 requests per 15 minutes per IP
const generalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiting for expensive operations - 10 requests per minute
const expensiveOperationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: 'Too many requests, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply general rate limiting to all API routes
app.use('/api/', generalApiLimiter);

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Create HTTP server and WebSocket
  const server = createServer(app);

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Security Fix H-02: WebSocket connection limits to prevent exhaustion attacks
  const MAX_WS_CONNECTIONS = 1000;
  const MAX_CONNECTIONS_PER_IP = 5;
  const connectionsPerIP = new Map<string, number>();

  wss.on('connection', (ws, req) => {
    const clientIP = req.socket.remoteAddress || 'unknown';
    
    // Check global connection limit
    if (clients.size >= MAX_WS_CONNECTIONS) {
      log(`WebSocket connection rejected: server at capacity (${clients.size}/${MAX_WS_CONNECTIONS})`);
      ws.close(1008, 'Server at capacity');
      return;
    }
    
    // Check per-IP connection limit
    const ipCount = connectionsPerIP.get(clientIP) || 0;
    if (ipCount >= MAX_CONNECTIONS_PER_IP) {
      log(`WebSocket connection rejected: too many connections from IP ${clientIP} (${ipCount}/${MAX_CONNECTIONS_PER_IP})`);
      ws.close(1008, 'Too many connections from this IP');
      return;
    }
    
    // Accept connection
    clients.add(ws);
    connectionsPerIP.set(clientIP, ipCount + 1);
    log(`WebSocket client connected from ${clientIP} (${clients.size} total, ${ipCount + 1} from this IP)`);
    
    ws.on('close', () => {
      clients.delete(ws);
      const currentCount = connectionsPerIP.get(clientIP) || 1;
      const newCount = Math.max(0, currentCount - 1);
      
      if (newCount === 0) {
        connectionsPerIP.delete(clientIP);
      } else {
        connectionsPerIP.set(clientIP, newCount);
      }
      
      log(`WebSocket client disconnected from ${clientIP} (${clients.size} total remaining)`);
    });
  });

  // Initialize canvas on startup
  await pixelStorage.initializeCanvas();
  log("Canvas initialized");

  // Ensure feedback table exists
  await ensureFeedbackTable();
  log("Feedback table ready");

  // Apply strict rate limiting to expensive operations BEFORE registering routes
  // This ensures the limiter wraps the handlers (Express executes middleware in order)
  app.use('/api/wallet/sync', expensiveOperationLimiter);
  app.use('/api/pixels/claim', expensiveOperationLimiter);
  app.use('/api/pixels/prepare-claim', expensiveOperationLimiter);
  app.use('/api/governance/points', expensiveOperationLimiter);

  // Register all feature routes
  registerUserRoutes(app);
  registerPixelRoutes(app);
  registerClusterRoutes(app);
  registerTransactionRoutes(app);
  registerStatsRoutes(app);
  registerAdminRoutes(app);
  registerSyncRoutes(app);
  registerGovernanceRoutes(app);
  registerFeedbackRoutes(app);

  // Frontend error logging endpoint
  app.post("/api/log-error", (req: Request, res: Response) => {
    const { context, error, details } = req.body;
    log(`[FRONTEND ERROR] ${context}`);
    if (error?.message) log(`  Message: ${error.message}`);
    if (error?.code) log(`  Code: ${error.code}`);
    if (error?.stack) log(`  Stack: ${error.stack}`);
    if (details) log(`  Details: ${JSON.stringify(details)}`);
    res.json({ logged: true });
  });

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Serve the app on the port specified in the environment variable PORT
  // Default to 5000 if not specified.
  // This serves both the API and the client.
  
  // Security Fix M-02: Validate parseInt to prevent NaN crashes
  const portStr = process.env.PORT || '5000';
  const port = parseInt(portStr, 10);
  if (isNaN(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT environment variable: ${portStr}. Must be a number between 1-65535.`);
  }
  
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
