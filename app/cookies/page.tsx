import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie Policy',
};

export default function CookiePolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-4 py-8 md:py-12">
        <header className="mb-8 md:mb-12 text-center">
          <h1 className="text-3xl md:text-4xl font-bold">Cookie Policy</h1>
          <p className="text-muted-foreground mt-2">
            Last updated: {new Date().toLocaleDateString()}
          </p>
        </header>

        <main className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl dark:prose-invert mx-auto">
          <p>
            This Cookie Policy explains how UniTaskAI (&quot;we&quot;,
            &quot;us&quot;, or &quot;our&quot;) uses cookies and similar
            technologies to recognize and remember you when you visit our
            website and application.
          </p>

          <section>
            <h2 id="what-are-cookies">1. What are Cookies?</h2>
            <p>
              Cookies are small text files that are placed on your device when
              you visit a website. Cookies are widely used to make websites work
              more efficiently and provide information to the website owners.
            </p>
            <p>
              Cookies can be &quot;persistent&quot; or &quot;session&quot;
              cookies. Persistent cookies remain on your device when you go
              offline, while session cookies are deleted as soon as you close
              your web browser.
            </p>
          </section>

          <section>
            <h2 id="how-we-use-cookies">2. How We Use Cookies</h2>
            <p>We use cookies for the following purposes:</p>
            <ul>
              <li>
                <strong>Essential cookies:</strong> These cookies are necessary
                for the website to function properly. They enable core
                functionality such as security, network management, and account
                access. You may disable these by changing your browser settings,
                but this may affect how the website functions.
              </li>
              <li>
                <strong>Analytics cookies:</strong> We use these cookies to
                collect information about how you interact with our website,
                which pages you visit, and if you experience any errors. This
                helps us improve our website and your experience.
              </li>
              <li>
                <strong>Functionality cookies:</strong> These cookies allow the
                website to remember choices you make (such as your language
                preference or dark/light mode settings) and provide enhanced
                features.
              </li>
              <li>
                <strong>Authentication cookies:</strong> These cookies help us
                identify you when you&apos;re logged in so you can access
                protected areas and features of the service.
              </li>
            </ul>
          </section>

          <section>
            <h2 id="third-party-cookies">3. Third-Party Cookies</h2>
            <p>
              We may use third-party services that use cookies on our website.
              These third-party services include:
            </p>
            <ul>
              <li>
                <strong>Analytics providers</strong> (like Google Analytics) to
                help us understand how visitors use our site.
              </li>
              <li>
                <strong>Authentication providers</strong> that help with account
                login processes.
              </li>
            </ul>
            <p>
              These third parties may use cookies, web beacons, and other
              storage technologies to collect or receive information from our
              website and use that information to provide measurement services
              and target ads.
            </p>
          </section>

          <section>
            <h2 id="managing-cookies">4. Managing Cookies</h2>
            <p>
              Most web browsers allow you to control cookies through their
              settings preferences. However, if you limit the ability of
              websites to set cookies, you may impair your overall user
              experience, as it will no longer be personalized to you.
            </p>
            <p>
              To manage cookies on different browsers, please consult your
              browser&apos;s help documentation:
            </p>
            <ul>
              <li>
                <a
                  href="https://support.google.com/chrome/answer/95647"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Google Chrome
                </a>
              </li>
              <li>
                <a
                  href="https://support.mozilla.org/en-US/kb/cookies-information-websites-store-on-your-computer"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Mozilla Firefox
                </a>
              </li>
              <li>
                <a
                  href="https://support.microsoft.com/en-us/microsoft-edge/delete-cookies-in-microsoft-edge-63947406-40ac-c3b8-57b9-2a946a29ae09"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Microsoft Edge
                </a>
              </li>
              <li>
                <a
                  href="https://support.apple.com/guide/safari/manage-cookies-and-website-data-sfri11471/mac"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Safari
                </a>
              </li>
            </ul>
          </section>

          <section>
            <h2 id="changes-to-cookie-policy">
              5. Changes to this Cookie Policy
            </h2>
            <p>
              We may update this Cookie Policy from time to time to reflect
              changes in technology, regulation, or our business practices. Any
              changes will become effective when we post the revised Cookie
              Policy. Your continued use of our website after such changes
              constitutes your consent to the updated policy.
            </p>
          </section>

          <section>
            <h2 id="contact-us">6. Contact Us</h2>
            <p>
              If you have any questions about our use of cookies or this Cookie
              Policy, please contact us at [Your Contact Email].
            </p>
          </section>
        </main>

        <footer className="mt-12 text-center text-sm text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} UniTaskAI. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}
