import { json } from '@remix-run/cloudflare';
import type { LoaderFunctionArgs } from '@remix-run/cloudflare';
import { createContextLogger } from '~/utils/logger';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const logger = createContextLogger(context);

  // Log 404 errors with structured data for New Relic
  logger.warn('Page not found', {
    url: url.pathname,
    method: request.method,
    user_agent: request.headers.get('User-Agent') || 'unknown',
    referrer: request.headers.get('Referer') || 'direct',
    error_type: '404_not_found',
  });

  return json({ message: 'Not Found' }, { status: 404 });
}

export default function CatchAll() {
  return (
    <div className="min-h-screen bg-base-100 flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold">404</h1>
        <p className="text-xl">Page Not Found</p>
        <p className="text-base-content/70">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="mt-4">
          <a href="/" className="btn btn-primary">
            Go Home
          </a>
        </div>
      </div>
    </div>
  );
}
