// Environment variable validation utilities

interface EnvVarConfig {
  name: string;
  required: boolean;
  description: string;
}

const ENV_VARS: EnvVarConfig[] = [
  // Database
  { name: 'DATABASE_URL', required: true, description: 'PostgreSQL database connection string' },
  
  // Authentication
  { name: 'BETTER_AUTH_SECRET', required: true, description: 'Secret key for Better Auth' },
  { name: 'BETTER_AUTH_URL', required: false, description: 'Base URL for Better Auth' },
  
  // Provider APIs
  { name: 'A1TOPUP_USERNAME', required: false, description: 'A1TopUp API username' },
  { name: 'A1TOPUP_PASSWORD', required: false, description: 'A1TopUp API password' },
  { name: 'REALROBO_API_TOKEN', required: false, description: 'RealRobo API token' },
  { name: 'MROBOTICS_API_TOKEN', required: false, description: 'MRobotics API token' },
  
  // Application
  { name: 'NODE_ENV', required: false, description: 'Node environment (development/production)' },
];

export function validateEnvironmentVariables(): void {
  const missing: string[] = [];
  const warnings: string[] = [];

  for (const envVar of ENV_VARS) {
    const value = process.env[envVar.name];
    
    if (envVar.required && !value) {
      missing.push(envVar.name);
    } else if (!envVar.required && !value) {
      warnings.push(`${envVar.name} (${envVar.description})`);
    }
  }

  if (missing.length > 0) {
    const errorMessage = `Missing required environment variables:\n${missing.map(name => `- ${name}`).join('\n')}`;
    throw new Error(errorMessage);
  }

  if (warnings.length > 0) {
    console.warn(`Optional environment variables not set:\n${warnings.map(name => `- ${name}`).join('\n')}`);
  }
}

export type LiveProvider = 'A1TOPUP' | 'REALROBO' | 'MROBOTICS';

export function validateProviderCredentials(
  provider: LiveProvider | 'TEST'
): void {
  if (provider === 'TEST') {
    return;
  }

  switch (provider) {
    case 'A1TOPUP':
      if (!process.env.A1TOPUP_USERNAME || !process.env.A1TOPUP_PASSWORD) {
        throw new Error('A1TopUp credentials not configured. Set A1TOPUP_USERNAME and A1TOPUP_PASSWORD environment variables.');
      }
      break;
    case 'REALROBO':
      if (!process.env.REALROBO_API_TOKEN) {
        throw new Error('RealRobo API token not configured. Set REALROBO_API_TOKEN environment variable.');
      }
      break;
    case 'MROBOTICS':
      if (!process.env.MROBOTICS_API_TOKEN) {
        throw new Error('MRobotics API token not configured. Set MROBOTICS_API_TOKEN environment variable.');
      }
      break;
  }
}

export function getAvailableProviders(): LiveProvider[] {
  const providers: LiveProvider[] = [];
  
  if (process.env.A1TOPUP_USERNAME && process.env.A1TOPUP_PASSWORD) {
    providers.push('A1TOPUP');
  }
  
  if (process.env.REALROBO_API_TOKEN) {
    providers.push('REALROBO');
  }
  
  if (process.env.MROBOTICS_API_TOKEN) {
    providers.push('MROBOTICS');
  }
  
  return providers;
}
