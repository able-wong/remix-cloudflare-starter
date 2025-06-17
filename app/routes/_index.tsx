import type { MetaFunction, LoaderFunctionArgs } from '@remix-run/cloudflare';
import { json } from '@remix-run/cloudflare';
import { createContextLogger } from '~/utils/logger';

export const meta: MetaFunction = () => {
  return [
    { title: 'Remix + TailwindCSS + DaisyUI Demo' },
    {
      name: 'description',
      content: 'A demo showcasing Remix, TailwindCSS, and DaisyUI components',
    },
  ];
};

export async function loader({ context }: LoaderFunctionArgs) {
  const logger = createContextLogger(context);

  logger.info('Index page loaded', {
    route: '/_index',
    timestamp: new Date().toISOString(),
    requestId: Math.random().toString(36).substring(7),
  });

  return json({ success: true });
}

export default function Index() {
  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    localStorage.setItem('theme', newTheme);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-base-100">
      <div className="navbar bg-base-200">
        <div className="flex-1">
          <span className="btn btn-ghost text-xl">
            Remix + TailwindCSS + DaisyUI Demo
          </span>
        </div>
        <div className="flex-none">
          <div className="dropdown dropdown-end">
            <button className="btn btn-ghost">
              Theme
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 fill-current"
                viewBox="0 0 24 24"
              >
                <path d="M12 2l-1.5 4.5h-6l4.5 3.5-1.5 4.5 4.5-3.5 4.5 3.5-1.5-4.5 4.5-3.5h-6L12 2z" />
              </svg>
            </button>
            <ul className="dropdown-content z-[1] menu p-2 shadow bg-base-100 rounded-box w-52">
              <li>
                <button onClick={() => handleThemeChange('light')}>
                  Light
                </button>
              </li>
              <li>
                <button onClick={() => handleThemeChange('dark')}>Dark</button>
              </li>
              <li>
                <button onClick={() => handleThemeChange('system')}>
                  System
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="container mx-auto p-4 space-y-8">
        {/* Cards Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Card Title</h2>
              <p>This is a basic card component from DaisyUI.</p>
              <div className="card-actions justify-end">
                <button className="btn btn-primary">Action</button>
              </div>
            </div>
          </div>

          <div className="card bg-base-200 shadow-xl">
            <figure className="px-10 pt-10">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-32 w-32 stroke-current"
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
            </figure>
            <div className="card-body">
              <h2 className="card-title">Card with Icon</h2>
              <p>This card includes an icon and some content.</p>
              <div className="card-actions justify-end">
                <button className="btn btn-secondary">Details</button>
              </div>
            </div>
          </div>

          <div className="card bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Interactive Card</h2>
              <p>This card has some interactive elements.</p>
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">Toggle me</span>
                  <input type="checkbox" className="toggle toggle-primary" />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Form Section */}
        <div className="card bg-base-200 shadow-xl max-w-md mx-auto">
          <div className="card-body space-y-4">
            <h2 className="card-title">Contact Form</h2>
            <div className="form-control w-full">
              <label htmlFor="name" className="label">
                <span className="label-text font-medium">Name</span>
              </label>
              <input
                id="name"
                type="text"
                placeholder="Enter your name"
                className="input input-bordered w-full"
              />
            </div>
            <div className="form-control w-full">
              <label htmlFor="email" className="label">
                <span className="label-text font-medium">Email</span>
              </label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                className="input input-bordered w-full"
              />
            </div>
            <div className="form-control w-full">
              <label htmlFor="message" className="label">
                <span className="label-text font-medium">Message</span>
              </label>
              <textarea
                id="message"
                className="textarea textarea-bordered w-full"
                placeholder="Your message"
              ></textarea>
            </div>
            <div className="card-actions justify-end">
              <button className="btn btn-primary">Send Message</button>
            </div>
          </div>
        </div>

        {/* Alert Section */}
        <div className="space-y-4">
          <div className="alert alert-info">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              className="stroke-current shrink-0 w-6 h-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              ></path>
            </svg>
            <span>This is an info alert</span>
          </div>
          <div className="alert alert-success">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="stroke-current shrink-0 h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>This is a success alert</span>
          </div>
        </div>
      </div>
    </div>
  );
}
