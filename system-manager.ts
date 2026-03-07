/**
 * مدير النظام - نسخة الويب المستوحاة من إدارة المستودعات في أندرويد
 * System Manager - Web version inspired by Dependency Resolution Management
 */

export interface RegistryStatus {
  name: string;
  status: 'online' | 'offline' | 'checking';
  latency?: number;
  url: string;
}

export const SystemManager = {
  /**
   * فحص حالة "المستودعات" (الخدمات الخارجية)
   * mimics checking connectivity to google() and mavenCentral()
   */
  async checkRegistryStatus(): Promise<RegistryStatus[]> {
    const registries: { name: string; url: string }[] = [
      { name: 'Google Services (Fonts/APIs)', url: 'https://fonts.googleapis.com/css?family=Inter' },
      { name: 'Maven Central (NPM/CDN)', url: 'https://registry.npmjs.org/' },
      { name: 'Smart Reminder API', url: window.location.origin },
    ];

    const results = await Promise.all(
      registries.map(async (reg) => {
        const start = Date.now();
        try {
          // Use mode: 'no-cors' for external domains to avoid CORS issues while checking connectivity
          await fetch(reg.url, { mode: 'no-cors', cache: 'no-store' });
          return {
            ...reg,
            status: 'online' as const,
            latency: Date.now() - start,
          };
        } catch (e) {
          return {
            ...reg,
            status: 'offline' as const,
          };
        }
      })
    );

    return results;
  },

  getAppMetadata() {
    return {
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development',
      platform: navigator.platform,
      userAgent: navigator.userAgent,
      language: navigator.language,
    };
  }
};
