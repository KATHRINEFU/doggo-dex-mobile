const { withPodfile } = require("expo/config-plugins");

/**
 * React Native 0.81's SPM post-install hook (scripts/cocoapods/spm.rb)
 * assumes every pod that registered an SPM dependency has a matching target
 * in the Pods project. When CocoaPods omits that target (seen with
 * @clerk/expo's ClerkExpo pod on EAS), pod install crashes with:
 *   undefined method `package_product_dependencies' for nil
 *
 * spm.rb dereferences the nil target in TWO places (add_spm_to_target and
 * the SWIFT_INCLUDE_PATHS workaround right after it), so instead of guarding
 * one method we filter invalid registrations inside SPMManager immediately
 * before its original post-install logic runs.
 */
function withReactNativeSpmGuard(config) {
  return withPodfile(config, (config) => {
    const podfile = config.modResults.contents;
    const marker = "DOGGO_DEX_RN_SPM_GUARD";

    const guard = `
    # ${marker}: filter SPM registrations whose pod target is missing.
    # React Native 0.81 otherwise crashes while updating the Pods project.
    # Patch the live ::SPM singleton (class reopening inside a Podfile lands in
    # the Pod::Podfile namespace and misses the real SPMManager).
    if defined?(::SPM) && ::SPM.respond_to?(:apply_on_post_install)
      unless ::SPM.respond_to?(:doggo_dex_apply_on_post_install)
        class << ::SPM
          alias_method :doggo_dex_apply_on_post_install, :apply_on_post_install

          def apply_on_post_install(installer)
            spm_deps = instance_variable_get(:@dependencies_by_pod)
            if spm_deps.is_a?(Hash)
              target_names = installer.pods_project.targets.map(&:name)
              spm_deps.delete_if do |pod_name, _|
                missing_target = !target_names.include?(pod_name)
                if missing_target
                  Pod::UI.warn "[${marker}] Skipping SPM deps for missing pod target: #{pod_name}"
                end
                missing_target
              end
            end
            doggo_dex_apply_on_post_install(installer)
          end
        end
      end
    end
`;

    const postInstallCall = "react_native_post_install(";
    const postInstallIndex = podfile.indexOf(postInstallCall);

    if (postInstallIndex === -1) {
      throw new Error(
        "Doggo Dex could not add the React Native SPM guard: react_native_post_install was not found.",
      );
    }

    const existingGuardIndex = podfile.indexOf(marker);
    if (existingGuardIndex === -1) {
      config.modResults.contents =
        podfile.slice(0, postInstallIndex) + guard + podfile.slice(postInstallIndex);
      return config;
    }

    const guardLineStart = podfile.lastIndexOf("\n", existingGuardIndex) + 1;
    config.modResults.contents =
      podfile.slice(0, guardLineStart) + guard + podfile.slice(postInstallIndex);
    return config;
  });
}

module.exports = withReactNativeSpmGuard;
