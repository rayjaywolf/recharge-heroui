// Startup validation - runs when the application initializes
import { validateEnvironmentVariables } from './env-validation';

// Validate environment variables at startup
try {
  validateEnvironmentVariables();
  console.log('✅ Environment variables validated successfully');
} catch (error) {
  console.error('❌ Environment validation failed:', error);
  // In development, we might want to continue with warnings
  // In production, this should crash the application
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}
