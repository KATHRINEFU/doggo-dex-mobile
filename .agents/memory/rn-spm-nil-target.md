---
name: RN 0.81 SPM nil-target pod install crash
description: Fixing "undefined method `package_product_dependencies' for nil" during pod install with @clerk/expo SPM deps
---

RN 0.81's `scripts/cocoapods/spm.rb` crashes during `pod install` when a pod that registered an SPM dependency (e.g. ClerkExpo via its podspec) has no matching target in the Pods project. There are TWO nil-target crash sites (inside `add_spm_to_target` and the SWIFT_INCLUDE_PATHS loop right after), so guarding only `add_spm_to_target` is insufficient.

**Fix:** Expo config plugin (`withPodfile`) injects Ruby into the generated Podfile just before `react_native_post_install`, filtering `SPM.instance_variable_get(:@dependencies_by_pod)` to drop entries whose pod target is missing from `installer.pods_project.targets`. Marker comment makes it idempotent.

**Why:** EAS/local pod install failed deterministically; upstream RN has no fix yet.

**How to apply:** Plugin lives at `artifacts/mobile/plugins/withReactNativeSpmGuard.js`, registered in `app.config.js`. Diagnostic tip: the `Podfile:NN` line number in the crash trace reveals whether the guard was actually in the Podfile that built — an unpatched Podfile calls `react_native_post_install` around line 56; the patched one pushes it lower. Remove the guard once RN fixes spm.rb upstream. Also note: `expo prebuild` adds side-effect `android`/`ios` scripts and duplicate expo/react deps to package.json — revert those after prebuild tests.
