import posthog from "posthog-js";
import type { LogAttributes, Properties } from "posthog-js";

const projectToken = import.meta.env.PUBLIC_POSTHOG_PROJECT_TOKEN;
const apiHost = import.meta.env.PUBLIC_POSTHOG_HOST;

if (!projectToken || !apiHost) {
  const missingVariable = !projectToken ? "PUBLIC_POSTHOG_PROJECT_TOKEN" : "PUBLIC_POSTHOG_HOST";
  throw new Error(`PostHog requires ${missingVariable} to be configured.`);
}

if (!posthog.__loaded) {
  posthog.init(projectToken, {
    api_host: apiHost,
    defaults: "2026-01-30",
    logs: {
      serviceName: "budapest-ramen-web",
      environment: import.meta.env.DEV ? "development" : "production",
    },
    capture_exceptions: {
      capture_unhandled_errors: true,
      capture_unhandled_rejections: true,
      capture_console_errors: false,
    },
  });
}

export function capture(event: string, properties?: Properties) {
  posthog.capture(event, properties);
}

export const guideLogger = {
  info(message: string, attributes?: LogAttributes) {
    posthog.logger.info(message, attributes);
  },
  warn(message: string, attributes?: LogAttributes) {
    posthog.logger.warn(message, attributes);
  },
};
