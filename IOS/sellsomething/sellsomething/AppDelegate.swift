import UIKit

final class AppDelegate: NSObject, UIApplicationDelegate {
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        PushNotificationManager.shared.configure()
        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        // When Firebase Messaging is added, pass deviceToken to Messaging.messaging().apnsToken
        // then read Messaging.messaging().fcmToken and call PushNotificationManager.shared.setToken(fcmToken)
        let token = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        PushNotificationManager.shared.setToken(token)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("APNs registration failed:", error.localizedDescription)
    }
}
