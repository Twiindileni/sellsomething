import Foundation
import UIKit
import UserNotifications
import WebKit

/// Native push setup for the WebView shell.
/// After adding Firebase Messaging (see docs/PUSH_NOTIFICATIONS.md), wire FCM token into `setToken(_:)`.
final class PushNotificationManager: NSObject, UNUserNotificationCenterDelegate {
    static let shared = PushNotificationManager()
    private(set) var pushToken: String?

    func configure() {
        UNUserNotificationCenter.current().delegate = self
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, _ in
            if granted {
                DispatchQueue.main.async {
                    UIApplication.shared.registerForRemoteNotifications()
                }
            }
        }
    }

    func setToken(_ token: String) {
        pushToken = token
        NotificationCenter.default.post(name: .sellSomethingPushTokenUpdated, object: token)
    }

    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        completionHandler([.banner, .sound, .badge])
    }

    func injectTokenScript(into webView: WKWebView) {
        guard let token = pushToken else { return }
        let safe = token.replacingOccurrences(of: "\\", with: "\\\\")
            .replacingOccurrences(of: "'", with: "\\'")
        let js = """
        (function(){
          window.__SELLSOMETHING_FCM_TOKEN__='\(safe)';
          window.dispatchEvent(new CustomEvent('sellsomething-push-token',{detail:'\(safe)'}));
        })();
        """
        webView.evaluateJavaScript(js, completionHandler: nil)
    }
}

extension Notification.Name {
    static let sellSomethingPushTokenUpdated = Notification.Name("sellSomethingPushTokenUpdated")
}
