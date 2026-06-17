import SwiftUI
import WebKit

struct WebView: UIViewRepresentable {
    let url: URL
    @Binding var isLoading: Bool
    @Binding var canGoBack: Bool
    @Binding var canGoForward: Bool
    @Binding var estimatedProgress: Double
    @Binding var reloadTrigger: Bool
    @Binding var goBackTrigger: Bool
    @Binding var goForwardTrigger: Bool
    
    class Coordinator: NSObject, WKNavigationDelegate {
        var parent: WebView
        var observation: NSKeyValueObservation?
        weak var webView: WKWebView?
        var lastLoadedUrl: URL?
        
        init(_ parent: WebView) {
            self.parent = parent
        }
        
        deinit {
            observation?.invalidate()
        }
        
        func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
            parent.isLoading = true
            updateNavigationStates(webView)
        }
        
        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            parent.isLoading = false
            updateNavigationStates(webView)
            webView.scrollView.refreshControl?.endRefreshing()
            PushNotificationManager.shared.injectTokenScript(into: webView)
        }
        
        func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
            parent.isLoading = false
            updateNavigationStates(webView)
            webView.scrollView.refreshControl?.endRefreshing()
        }
        
        func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
            parent.isLoading = false
            updateNavigationStates(webView)
            webView.scrollView.refreshControl?.endRefreshing()
        }
        
        private func updateNavigationStates(_ webView: WKWebView) {
            parent.canGoBack = webView.canGoBack
            parent.canGoForward = webView.canGoForward
        }
        
        func setupProgressObservation(for webView: WKWebView) {
            observation = webView.observe(\.estimatedProgress, options: [.new]) { [weak self] webView, change in
                guard let self = self else { return }
                self.parent.estimatedProgress = change.newValue ?? 0.0
            }
        }
        
        @objc func handleRefreshControl(sender: UIRefreshControl) {
            if let webView = webView {
                webView.reload()
            } else {
                sender.endRefreshing()
            }
        }
    }
    
    func makeCoordinator() -> Coordinator {
        Coordinator(self)
    }
    
    func makeUIView(context: Context) -> WKWebView {
        print("WebView: makeUIView called with URL: \(url.absoluteString)")
        let webConfiguration = WKWebViewConfiguration()
        let webView = WKWebView(frame: .zero, configuration: webConfiguration)
        webView.navigationDelegate = context.coordinator
        context.coordinator.webView = webView
        
        // Setup Progress Observation
        context.coordinator.setupProgressObservation(for: webView)
        
        // Setup Pull-to-refresh
        let refreshControl = UIRefreshControl()
        refreshControl.addTarget(
            context.coordinator,
            action: #selector(Coordinator.handleRefreshControl(sender:)),
            for: .valueChanged
        )
        webView.scrollView.refreshControl = refreshControl

        NotificationCenter.default.addObserver(
            forName: .sellSomethingPushTokenUpdated,
            object: nil,
            queue: .main
        ) { [weak webView] _ in
            guard let webView else { return }
            PushNotificationManager.shared.injectTokenScript(into: webView)
        }
        
        // Make scrolling bounce feel native
        webView.scrollView.bounces = true
        webView.allowsBackForwardNavigationGestures = true
        
        // Load initial URL and track it
        context.coordinator.lastLoadedUrl = url
        let request = URLRequest(url: url)
        webView.load(request)
        
        return webView
    }
    
    func updateUIView(_ uiView: WKWebView, context: Context) {
        print("WebView: updateUIView. url: \(url.absoluteString), lastLoadedUrl: \(context.coordinator.lastLoadedUrl?.absoluteString ?? "nil"), isLoading: \(uiView.isLoading)")
        
        // Load new URL ONLY if the parent's target URL has actually changed
        // compared to the last URL we explicitly loaded.
        if context.coordinator.lastLoadedUrl != url {
            print("WebView: URL changed! Reloading. Old: \(context.coordinator.lastLoadedUrl?.absoluteString ?? "nil") -> New: \(url.absoluteString)")
            context.coordinator.lastLoadedUrl = url
            let request = URLRequest(url: url)
            uiView.load(request)
            return
        }
        
        // Handle trigger events
        if reloadTrigger {
            print("WebView: reloadTrigger active. Reloading webview.")
            DispatchQueue.main.async {
                self.reloadTrigger = false
                uiView.reload()
            }
        }
        
        if goBackTrigger {
            print("WebView: goBackTrigger active.")
            DispatchQueue.main.async {
                self.goBackTrigger = false
                if uiView.canGoBack {
                    uiView.goBack()
                }
            }
        }
        
        if goForwardTrigger {
            print("WebView: goForwardTrigger active.")
            DispatchQueue.main.async {
                self.goForwardTrigger = false
                if uiView.canGoForward {
                    uiView.goForward()
                }
            }
        }
    }
}
