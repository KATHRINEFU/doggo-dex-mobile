const { withPodfile } = require("@expo/config-plugins");

/**
 * React Native 0.81's SPM post-install hook assumes every pod registered
 * with an SPM dependency still has a matching Xcode target. Clerk Expo
 * registers ClerkKit through SPM, and CocoaPods can omit that target during
 * EAS pod generation, causing:
 *   undefined method `package_product_dependencies' for nil
 *
 * Guard the hook at the generated Podfile level. This keeps the normal
 * React Native post-install behavior and only skips an invalid SPM entry.
 */
function withReactNativeSpmGuard(config) {
  return withPodfile(config, (config) => {
    const podfile = config.modResults.contents;
    const marker = "DOGGO_DEX_RN_SPM_GUARD";

    if (podfile.includes(marker)) {
      return config;
    }

    const guard = `
    # ${marker}: Clerk Expo + React Native 0.81 CocoaPods SPM compatibility
    if defined?(SPMManager)
      class SPMManager
        alias doggo_dex_add_spm_to_target add_spm_to_target

        def add_spm_to_target(project, target, url, requirement, products)
          return unless target
          doggo_dex_add_spm_to_target(project, target, url, requirement, products)
        end
      end
    end
`;

    const postInstallCall = "react_native_post_install(";
    const index = podfile.indexOf(postInstallCall);

    if (index === -1) {
      throw new Error(
        "Doggo Dex could not add the React Native SPM guard: react_native_post_install was not found.",
      );
    }

    config.modResults.contents =
      podfile.slice(0, index) + guard + podfile.slice(index);
    return config;
  });
}

module.exports = withReactNativeSpmGuard;