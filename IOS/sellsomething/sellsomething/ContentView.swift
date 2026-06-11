import SwiftUI

struct ContentView: View {
    // Design System Tokens (matching Website App.css)
    let dune = Color(red: 196/255, green: 169/255, blue: 125/255)
    let sand = Color(red: 232/255, green: 213/255, blue: 176/255)
    let charcoal = Color(red: 28/255, green: 24/255, blue: 20/255)
    let ink = Color(red: 45/255, green: 37/255, blue: 32/255)
    let whiteColor = Color(red: 253/255, green: 250/255, blue: 245/255)
    let accent = Color(red: 212/255, green: 80/255, blue: 10/255)
    let accent2 = Color(red: 46/255, green: 125/255, blue: 82/255)
    let muted = Color(red: 154/255, green: 136/255, blue: 120/255)
    
    let accentGradient = LinearGradient(
        colors: [
            Color(red: 212/255, green: 80/255, blue: 10/255), // #D4500A (Accent Start)
            Color(red: 232/255, green: 106/255, blue: 37/255) // #E86A25 (Accent End)
        ],
        startPoint: .leading,
        endPoint: .trailing
    )
    
    @State private var urlString = "http://localhost:3000"
    @State private var activeUrl = URL(string: "http://localhost:3000")!
    
    @State private var isLoading = false
    @State private var canGoBack = false
    @State private var canGoForward = false
    @State private var estimatedProgress = 0.0
    
    // Action triggers to communicate with WKWebView
    @State private var reloadTrigger = false
    @State private var goBackTrigger = false
    @State private var goForwardTrigger = false
    
    @State private var showSettings = false
    @State private var showShareSheet = false
    
    var body: some View {
        VStack(spacing: 0) {
            // Header Bar
            headerBar
            
            // Progress Bar
            progressBar
            
            // WKWebView Wrapper
            WebView(
                url: activeUrl,
                isLoading: $isLoading,
                canGoBack: $canGoBack,
                canGoForward: $canGoForward,
                estimatedProgress: $estimatedProgress,
                reloadTrigger: $reloadTrigger,
                goBackTrigger: $goBackTrigger,
                goForwardTrigger: $goForwardTrigger
            )
            .edgesIgnoringSafeArea(.bottom)
            
            // Bottom navigation toolbar
            bottomToolbar
        }
        .sheet(isPresented: $showShareSheet) {
            ShareSheet(activityItems: [activeUrl])
        }
        .preferredColorScheme(.dark) // Match the website's dark navbar theme
    }
    
    // Header Bar UI (Matching website branding and colors)
    private var headerBar: some View {
        VStack(spacing: 0) {
            HStack {
                HStack(spacing: 2) {
                    Text("Sell")
                        .font(.system(.title3, design: .rounded))
                        .fontWeight(.black)
                        .foregroundColor(sand)
                    
                    Text("Something")
                        .font(.system(.title3, design: .rounded))
                        .fontWeight(.black)
                        .foregroundStyle(accentGradient)
                }
                
                Spacer()
                
                // Connection indicator
                HStack(spacing: 6) {
                    Circle()
                        .fill(isLoading ? Color.orange : accent2)
                        .frame(width: 8, height: 8)
                    Text(isLoading ? "Loading..." : "Connected")
                        .font(.caption2)
                        .foregroundColor(dune)
                }
                .padding(.horizontal, 10)
                .padding(.vertical, 4)
                .background(ink)
                .cornerRadius(20)
                .overlay(
                    RoundedRectangle(cornerRadius: 20)
                        .stroke(dune.opacity(0.2), lineWidth: 1)
                )
                
                Button(action: {
                    withAnimation(.spring()) {
                        showSettings.toggle()
                    }
                }) {
                    Image(systemName: showSettings ? "chevron.up.circle.fill" : "gearshape.fill")
                        .font(.title3)
                        .foregroundColor(showSettings ? accent : dune)
                        .padding(.leading, 8)
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 14)
            .background(charcoal)
            
            // Expandable settings drawer
            if showSettings {
                VStack(alignment: .leading, spacing: 12) {
                    Text("ENVIRONMENT CONFIGURATION")
                        .font(.caption2)
                        .fontWeight(.bold)
                        .foregroundColor(muted)
                    
                    HStack(spacing: 10) {
                        TextField("Server URL", text: $urlString)
                            .padding(10)
                            .background(charcoal)
                            .cornerRadius(8)
                            .foregroundColor(whiteColor)
                            .font(.subheadline)
                            .keyboardType(.URL)
                            .autocapitalization(.none)
                            .disableAutocorrection(true)
                            .overlay(
                                RoundedRectangle(cornerRadius: 8)
                                    .stroke(dune.opacity(0.3), lineWidth: 1)
                            )
                        
                        Button(action: {
                            connectToUrl()
                        }) {
                            Text("Connect")
                                .fontWeight(.semibold)
                                .foregroundColor(.white)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 10)
                                .background(accentGradient)
                                .cornerRadius(8)
                        }
                    }
                    
                    // Quick presets
                    HStack(spacing: 8) {
                        PresetButton(title: "Local Server (3000)", url: "http://localhost:3000", urlString: $urlString, action: connectToUrl, dune: dune, charcoal: charcoal)
                        PresetButton(title: "Namibia Production", url: "https://sellsomething.com", urlString: $urlString, action: connectToUrl, dune: dune, charcoal: charcoal)
                    }
                }
                .padding()
                .background(ink)
                .transition(.move(edge: .top).combined(with: .opacity))
                .border(dune.opacity(0.15), width: 1)
            }
        }
    }
    
    // Progress Bar UI (with rust orange accent gradient)
    private var progressBar: some View {
        ZStack(alignment: .leading) {
            if isLoading && estimatedProgress < 1.0 {
                Rectangle()
                    .fill(charcoal.opacity(0.5))
                    .frame(height: 3)
                
                GeometryReader { geometry in
                    Rectangle()
                        .fill(accentGradient)
                        .frame(width: CGFloat(estimatedProgress) * geometry.size.width, height: 3)
                }
                .frame(height: 3)
                .transition(.opacity)
            }
        }
    }
    
    // Bottom Toolbar UI (Using brand themes)
    private var bottomToolbar: some View {
        HStack {
            Button(action: { goBackTrigger = true }) {
                Image(systemName: "chevron.left")
                    .font(.title3)
                    .bold()
                    .foregroundColor(canGoBack ? accent : muted)
            }
            .disabled(!canGoBack)
            
            Spacer()
            
            Button(action: { goForwardTrigger = true }) {
                Image(systemName: "chevron.right")
                    .font(.title3)
                    .bold()
                    .foregroundColor(canGoForward ? accent : muted)
            }
            .disabled(!canGoForward)
            
            Spacer()
            
            Button(action: { reloadTrigger = true }) {
                Image(systemName: isLoading ? "xmark" : "arrow.clockwise")
                    .font(.title3)
                    .foregroundColor(accent)
            }
            
            Spacer()
            
            Button(action: { showShareSheet = true }) {
                Image(systemName: "square.and.arrow.up")
                    .font(.title3)
                    .foregroundColor(accent)
            }
            
            Spacer()
            
            Button(action: {
                if UIApplication.shared.canOpenURL(activeUrl) {
                    UIApplication.shared.open(activeUrl)
                }
            }) {
                Image(systemName: "safari")
                    .font(.title3)
                    .foregroundColor(accent)
            }
        }
        .padding(.horizontal, 30)
        .padding(.vertical, 14)
        .background(charcoal)
        .overlay(
            Rectangle()
                .fill(dune.opacity(0.15))
                .frame(height: 1),
            alignment: .top
        )
    }
    
    private func connectToUrl() {
        var cleanUrlString = urlString.trimmingCharacters(in: .whitespacesAndNewlines)
        if !cleanUrlString.lowercased().hasPrefix("http://") && !cleanUrlString.lowercased().hasPrefix("https://") {
            cleanUrlString = "http://" + cleanUrlString
        }
        
        if let newUrl = URL(string: cleanUrlString) {
            activeUrl = newUrl
            urlString = cleanUrlString
            withAnimation {
                showSettings = false
            }
        }
    }
}

// Preset button view helper
struct PresetButton: View {
    let title: String
    let url: String
    @Binding var urlString: String
    let action: () -> Void
    
    let dune: Color
    let charcoal: Color
    
    var body: some View {
        Button(action: {
            urlString = url
            action()
        }) {
            Text(title)
                .font(.caption)
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(charcoal)
                .foregroundColor(.white)
                .cornerRadius(6)
                .overlay(
                    RoundedRectangle(cornerRadius: 6)
                        .stroke(dune.opacity(0.4), lineWidth: 1)
                )
        }
    }
}

struct ShareSheet: UIViewControllerRepresentable {
    var activityItems: [Any]
    var applicationActivities: [UIActivity]? = nil
    
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: activityItems, applicationActivities: applicationActivities)
    }
    
    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

#Preview {
    ContentView()
}
