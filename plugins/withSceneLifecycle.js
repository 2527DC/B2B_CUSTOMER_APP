const { withInfoPlist, withAppDelegate } = require('expo/config-plugins');

/**
 * iOS 27 asserts at launch unless the app adopts the scene-based life cycle.
 * This hands window creation to Expo's ExpoAppSceneDelegate and keeps the change
 * across `expo prebuild`, which regenerates ios/ from the template.
 */
const withSceneLifecycle = (config) => {
  config = withInfoPlist(config, (config) => {
    config.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: 'EXExpoAppSceneDelegate',
          },
        ],
      },
    };
    return config;
  });

  config = withAppDelegate(config, (config) => {
    if (config.modResults.language !== 'swift') {
      throw new Error('withSceneLifecycle only supports a Swift AppDelegate');
    }
    let contents = config.modResults.contents;

    if (!contents.includes('ExpoReactNativeFactoryProvider')) {
      contents = contents.replace(
        'class AppDelegate: ExpoAppDelegate {',
        'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {'
      );
    }

    // The scene delegate creates the window and starts React Native, so the app delegate must not.
    contents = contents.replace(
      /#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)[\s\S]*?#endif\n/,
      '    // The window is created and React Native is started by ExpoAppSceneDelegate.\n'
    );

    if (
      !contents.includes('ExpoReactNativeFactoryProvider') ||
      contents.includes('UIWindow(frame: UIScreen.main.bounds)')
    ) {
      throw new Error('withSceneLifecycle could not patch AppDelegate.swift: the template has changed');
    }

    config.modResults.contents = contents;
    return config;
  });

  return config;
};

module.exports = withSceneLifecycle;
