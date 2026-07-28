const { withPodfile } = require("@expo/config-plugins");

/**
 * React Native 0.81's SPM post-install hook (scripts/cocoapods/spm.rb)
 * assumes every pod that registered an SPM dependency has a matching target
 * in the Pods project. When CocoaPods omits that target (seen with
 * @clerk/expo's ClerkExpo pod on EAS), pod install crashes with:
 *   undefined method `package_product_dependencies' for nil
 *
 * spm.rb dereferences the nil target in TWO places (add_spm_to_target and
 * the SWIFT_INCLUDE_PATHS workaround right after it), so instead of guarding
 * one method we drop any SPM registration whose pod target doesn't exist,
 * right before react_native_post_install runs.
 */
function withReactNativeSpmGuard(config) {
  return withPodfile(config, (config) => {
    const podfile = config.modResults.contents;
    const marker = "DOGGO_DEX_RN_SPM_GUARD";

    if (podfile.includes(marker)) {
      return config;
    }

    const guard = `
    # ${marker}: drop SPM registrations whose pod target is missing to avoid
    # React Native 0.81 spm.rb crashing on a nil target during pod install.
    if defined?(SPM) && SPM.respond_to?(:instance_variable_get)
      spm_deps = SPM.instance_variable_get(:@dependencies_by_pod)
      if spm_deps.is_a?(Hash)
        target_names = installer.pods_project.targets.map(&:name)
        spm_deps.each_key do |pod_name|
          unless target_names.include?(pod_name)
            Pod::UI.warn "[${marker}] Skipping SPM deps for missing pod target: #{pod_name}"
          end
        end
        spm_deps.select! { |pod_name, _| target_names.include?(pod_name) }
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
