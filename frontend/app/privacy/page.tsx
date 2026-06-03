import Header from "@/components/Header";
import Footer from "@/components/Footer";
import UnifiedBackground from "@/components/UnifiedBackground";

export default function PrivacyPage() {
  return (
    <div className="relative min-h-screen">
      <UnifiedBackground />
      <Header />
      <main className="relative z-10 container mx-auto px-4 pt-32 pb-20 max-w-4xl">
        <div className="bg-gray-800/50 backdrop-blur-xl rounded-3xl border border-gray-700 p-8">
          <h1 className="text-4xl font-bold text-white mb-6">Privacy Policy</h1>

          <div className="space-y-6 text-gray-300">
            <section>
              <h2 className="text-2xl font-bold text-white mb-3">
                1. Information We Collect
              </h2>
              <p className="mb-2">We collect the following information:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>
                  <strong>Wallet Address:</strong> Your Celo blockchain wallet
                  address
                </li>
                <li>
                  <strong>Twitter Information (Optional):</strong> When you link
                  your Twitter account, we collect:
                  <ul className="list-disc list-inside ml-6 mt-1">
                    <li>Twitter username</li>
                    <li>Twitter user ID</li>
                    <li>Profile picture URL</li>
                  </ul>
                </li>
                <li>
                  <strong>On-chain Data:</strong> Your predictions and match
                  results (publicly available on blockchain)
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">
                2. How We Use Your Information
              </h2>
              <p className="mb-2">We use your information to:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Provide and improve our prediction platform services</li>
                <li>Verify your identity through Twitter (optional)</li>
                <li>Display your Twitter handle when you win predictions</li>
                <li>Ensure platform security and prevent fraud</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">
                3. Data Sharing
              </h2>
              <p>
                We do not sell your personal information. Your Twitter handle is
                only displayed publicly when you win a prediction. Your wallet
                address and predictions are visible on the public blockchain.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">
                4. Twitter Integration
              </h2>
              <p>
                When you link your Twitter account, we access only your public
                profile information (username, ID, profile picture). We do not
                access your tweets, direct messages, or followers. You can
                unlink your Twitter account at any time from your profile page.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">
                5. Data Storage
              </h2>
              <p>
                Your Twitter information is stored securely on our servers.
                Blockchain data (predictions, match results) is stored
                permanently on the Celo blockchain and cannot be deleted.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">
                6. Your Rights
              </h2>
              <p className="mb-2">You have the right to:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Unlink your Twitter account at any time</li>
                <li>
                  Request deletion of your Twitter information from our servers
                </li>
                <li>Access the information we have about you</li>
              </ul>
              <p className="mt-2">
                Note: Blockchain data cannot be deleted as it is permanently
                recorded on-chain.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">
                7. Security
              </h2>
              <p>
                We implement appropriate security measures to protect your
                information. However, no method of transmission over the
                Internet is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">
                8. Children's Privacy
              </h2>
              <p>
                Our service is not directed to children under 13. We do not
                knowingly collect information from children under 13.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">
                9. Changes to Privacy Policy
              </h2>
              <p>
                We may update this privacy policy from time to time. We will
                notify users of any material changes by posting the new policy
                on this page.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold text-white mb-3">
                10. Contact Us
              </h2>
              <p>
                If you have questions about this privacy policy or your data,
                please contact us through our social media channels.
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
