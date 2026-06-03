import Header from "@/components/Header";
import Footer from "@/components/Footer";
import UnifiedBackground from "@/components/UnifiedBackground";

export default function TermsPage() {
  return (
    <div className="relative min-h-screen">
      <UnifiedBackground />
      <Header />
      <main className="relative z-10 container mx-auto px-4 pt-32 pb-20 max-w-4xl">
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-3xl border border-gray-700 p-8">
          <h1 className="text-4xl font-bold text-white mb-6">
            Terms of Service
          </h1>

          <div className="space-y-6 text-gray-300">
            <section>
              <h2 className="text-2xl font-bold text-white mb-3">
                1. Acceptance of Terms
              </h2>
              <p>
                By accessing and using TrueCall, you accept and agree to be
                bound by these Terms of Service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">
                2. Description of Service
              </h2>
              <p>
                TrueCall is a blockchain-based sports prediction platform where
                users can make predictions on match outcomes and compete for
                prizes.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">
                3. Twitter Verification
              </h2>
              <p>
                Users may optionally link their Twitter account to verify their
                identity. By linking your Twitter account, you authorize us to
                access your public Twitter profile information (username, ID,
                and profile picture) and display your Twitter handle when you
                win predictions.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">
                4. User Conduct
              </h2>
              <p>
                You agree not to use the service for any unlawful purpose or in
                any way that could damage, disable, overburden, or impair the
                service.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">
                5. Blockchain Transactions
              </h2>
              <p>
                All predictions and transactions are recorded on the Celo
                blockchain. Users are responsible for understanding blockchain
                technology and managing their wallet security.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">
                6. Disclaimer
              </h2>
              <p>
                TrueCall is provided "as is" without warranties of any kind. We
                are not responsible for any losses incurred through use of the
                platform.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">
                7. Changes to Terms
              </h2>
              <p>
                We reserve the right to modify these terms at any time.
                Continued use of the service constitutes acceptance of modified
                terms.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">8. Contact</h2>
              <p>
                For questions about these terms, please contact us through our
                social media channels.
              </p>
            </section>
          </div>

          <p className="text-gray-500 text-sm mt-8">
            Last updated: June 3, 2026
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
