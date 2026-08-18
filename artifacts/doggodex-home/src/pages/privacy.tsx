export function Privacy() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 md:py-24">
      <div className="container mx-auto px-4 md:px-6 max-w-4xl">
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-8 md:p-12 prose prose-slate md:prose-lg max-w-none">
          <h1 className="text-3xl md:text-5xl font-display font-bold text-slate-900 mb-2">Privacy Policy</h1>
          <p className="text-slate-500 font-medium mb-8">Last updated: August 2026</p>

          <p>
            Welcome to Doggo Dex (“we,” “us,” or the “App”). We value your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, store, and protect your data when you use the App.
          </p>

          <h2 className="text-2xl font-display font-bold text-slate-900 mt-10 mb-4">1. Information We Collect and Use</h2>

          <h3 className="text-xl font-bold text-slate-800 mt-6 mb-3">1.1 Camera and Photo Permissions</h3>
          <p>
            Doggo Dex identifies dog breeds using a <strong>“on-device first, cloud assistance when needed”</strong> approach:
          </p>
          <ul>
            <li>
              <strong>On-device identification:</strong> In the iOS and Android apps, we first use the model bundled in the App. When the on-device model identifies a dog with at least our current 60% confidence threshold, the identification is completed locally and <strong>that scan photo is not sent to our server</strong>.
            </li>
            <li>
              <strong>Cloud-assisted identification:</strong> If the on-device model is unavailable, errors, cannot identify the image, or falls below the confidence threshold, the App sends that photo as Base64-encoded data to our server for additional identification.
            </li>
            <li>
              <strong>Web identification:</strong> The web version does not run the on-device model. Every web scan sends the photo to our server for identification.
            </li>
            <li>
              <strong>Photos from your library:</strong> Photos taken with the camera and photos selected from your library follow the same rules above.
            </li>
            <li>
              <strong>Cancelled requests:</strong> If you cancel after a request has been sent, we will stop showing the result, but the request may still finish in the background.
            </li>
          </ul>
          <p>
            We therefore do not claim that your photos always remain on your device. When cloud assistance is used, the photo leaves your device and is processed as described in Sections 2 and 3.
          </p>

          <h3 className="text-xl font-bold text-slate-800 mt-6 mb-3">1.2 Account and Profile Data</h3>
          <p>
            When you create a Doggo Dex account, we collect basic information such as your username, email address, and optional profile photo. We use this information to create your public profile, display leaderboard information, and synchronize account data.
          </p>

          <h3 className="text-xl font-bold text-slate-800 mt-6 mb-3">1.3 Game Progress and Doggo Dex Data</h3>
          <p>
            Your collection, experience points (XP), streaks, and badge progress are stored locally on your device and separated by signed-in account. When you collect a breed, its photos are recorded as local device paths for that breed, with up to 10 photos per breed. <strong>These collection photos are not uploaded to our server.</strong>
          </p>
          <p>
            To provide global leaderboards, we synchronize aggregate data such as your total XP and collected-breed count, along with account information including your account ID, username, display name, optional country, and avatar link.
          </p>

          <h2 className="text-2xl font-display font-bold text-slate-900 mt-10 mb-4">2. Third-Party Processors</h2>

          <h3 className="text-xl font-bold text-slate-800 mt-6 mb-3">2.1 Scan Photo Processors</h3>
          <p>
            When cloud-assisted identification is used, your photo is sent to our server. Our server may convert the image format in memory and may forward it to the following processors:
          </p>
          <ul>
            <li>
              <strong>Our breed-identification service:</strong> Used to run the breed-identification model on the server. Depending on our deployment configuration, this service may run on our server or on a third-party model-hosting platform we use.
            </li>
            <li>
              <strong>OpenAI:</strong> If the earlier identification step does not produce a reliable result, we may send the photo to OpenAI’s model service for image understanding and a final breed estimate. OpenAI processes that photo under its own terms and privacy policy.
            </li>
          </ul>
          <p>
            A scan request does not include your account ID, username, or email address. However, the photo itself may contain information that identifies people, such as a person appearing in the frame. Do not upload photos that you do not want processed by third parties.
          </p>

          <h3 className="text-xl font-bold text-slate-800 mt-6 mb-3">2.2 AI-Generated Badge Images</h3>
          <p>
            When you unlock certain achievements, the App generates a unique badge image. The generation prompt includes badge information such as its name and type, and <strong>does not include your real photos or personal identity information</strong>. Generated badge images are stored in our object storage and associated with your account.
          </p>

          <h3 className="text-xl font-bold text-slate-800 mt-6 mb-3">2.3 Account Authentication</h3>
          <p>
            We use Clerk for account registration, login, and authentication. If you choose to set a profile photo, it is uploaded to and stored by Clerk and may appear on your public profile and leaderboard.
          </p>

          <h2 className="text-2xl font-display font-bold text-slate-900 mt-10 mb-4">3. Data Storage and Retention</h2>
          <ul>
            <li>
              <strong>Scan photos:</strong> Photos used for cloud-assisted identification are used while processing that request. We do not write them to our database or object storage. Our server may record operational logs such as the identification result and processing time for a limited period to troubleshoot issues. Any retention by third-party processors such as OpenAI is governed by their respective policies; we cannot make retention promises on their behalf.
            </li>
            <li>
              <strong>Collection and progress:</strong> Stored locally on your device and removed when you uninstall the App or clear its data.
            </li>
            <li>
              <strong>Account and leaderboard data:</strong> Stored on our protected servers until you request account deletion.
            </li>
            <li>
              <strong>Badge images:</strong> Stored in our object storage until you request account deletion.
            </li>
          </ul>
          <p>
            To request deletion of your account and associated data, use the account settings in the App or contact us by email below.
          </p>

          <h2 className="text-2xl font-display font-bold text-slate-900 mt-10 mb-4">4. Children’s Privacy</h2>
          <p>
            The App is not directed to children under 13. We do not knowingly collect personal information from children under 13. If we learn that we have unintentionally collected such information, we will take steps to delete it.
          </p>

          <h2 className="text-2xl font-display font-bold text-slate-900 mt-10 mb-4">5. Changes to This Privacy Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. If we make material changes, we will notify you in the App or by email. Please review this page periodically for the latest information about our privacy practices.
          </p>

          <h2 className="text-2xl font-display font-bold text-slate-900 mt-10 mb-4">6. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or want to exercise your privacy rights, contact us at:
          </p>
          <div className="bg-slate-100 p-4 rounded-xl inline-block mt-2">
            <a href="mailto:yuehaofu208@gmail.com" className="text-primary font-medium hover:underline text-lg">contact: yuehaofu208@gmail.com</a>
          </div>
        </div>
      </div>
    </div>
  );
}