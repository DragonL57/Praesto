// Simple logging middleware for debugging and monitoring model usage
export const loggingMiddleware = {
  // Simple timing wrapper for generate operations
  logGenerate: async <T>(
    operation: () => Promise<T>,
    operationName: string = 'Model Generation',
  ): Promise<T> => {
    const startTime = Date.now();
    console.log(`${operationName} Started`);

    try {
      const result = await operation();
      const duration = Date.now() - startTime;

      console.log(`${operationName} Completed`);
      console.log(`Duration: ${duration}ms`);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`${operationName} Failed`);
      console.error(`Duration before failure: ${duration}ms`);
      console.error(`Error:`, error);
      throw error;
    }
  },

  // Simple timing wrapper for stream operations
  logStream: async <T>(
    operation: () => Promise<T>,
    operationName: string = 'Model Streaming',
  ): Promise<T> => {
    const startTime = Date.now();
    console.log(`${operationName} Started`);

    try {
      const result = await operation();
      const duration = Date.now() - startTime;

      console.log(`${operationName} Initialized`);
      console.log(`Init Duration: ${duration}ms`);

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`${operationName} Failed`);
      console.error(`Duration before failure: ${duration}ms`);
      console.error(`Error:`, error);
      throw error;
    }
  },

  // Log basic operation info
  logOperation: (
    operationName: string,
    details: Record<string, unknown> = {},
  ) => {
    console.log(`${operationName}:`, details);
  },

  // Log operation completion
  logCompletion: (
    operationName: string,
    duration: number,
    details: Record<string, unknown> = {},
  ) => {
    console.log(`${operationName} Completed in ${duration}ms:`, details);
  },
};

// Development-only logging middleware (only logs when not in production)
export const devLoggingMiddleware = {
  logGenerate: async <T>(
    operation: () => Promise<T>,
    operationName: string,
  ): Promise<T> => {
    // Only log in development
    if (process.env.NODE_ENV === 'production') {
      return operation();
    }

    return loggingMiddleware.logGenerate(operation, operationName);
  },

  logStream: async <T>(
    operation: () => Promise<T>,
    operationName: string,
  ): Promise<T> => {
    // Only log in development
    if (process.env.NODE_ENV === 'production') {
      return operation();
    }

    return loggingMiddleware.logStream(operation, operationName);
  },

  logOperation: (
    operationName: string,
    details: Record<string, unknown> = {},
  ) => {
    // Only log in development
    if (process.env.NODE_ENV === 'production') {
      return;
    }

    loggingMiddleware.logOperation(operationName, details);
  },

  logCompletion: (
    operationName: string,
    duration: number,
    details: Record<string, unknown> = {},
  ) => {
    // Only log in development
    if (process.env.NODE_ENV === 'production') {
      return;
    }

    loggingMiddleware.logCompletion(operationName, duration, details);
  },
};
