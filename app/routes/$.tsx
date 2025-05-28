import { json } from "@remix-run/cloudflare";
import type { LoaderFunctionArgs } from "@remix-run/cloudflare";

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const logData = {
    time: new Date().toISOString(),
    route: url.pathname,
    description: "404 Not Found",
  };
  
  console.log(JSON.stringify(logData));

  return json(
    { message: "Not Found" },
    { status: 404 }
  );
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
