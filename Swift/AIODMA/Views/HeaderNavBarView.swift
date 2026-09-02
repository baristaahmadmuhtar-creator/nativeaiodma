import SwiftUI

public struct HeaderNavBarView: View {
    @ObservedObject var orderVM: OrderViewModel
    @Binding var showModeDropdown: Bool
    @Binding var showOptionsSheet: Bool
    var onBack: () -> Void
    var onShowTracker: () -> Void
    var onShowTableInfo: () -> Void
    var onChangeLanguage: () -> Void
    var onCallWaiter: () -> Void
    
    public init(
        orderVM: OrderViewModel,
        showModeDropdown: Binding<Bool>,
        showOptionsSheet: Binding<Bool>,
        onBack: @escaping () -> Void,
        onShowTracker: @escaping () -> Void,
        onShowTableInfo: @escaping () -> Void,
        onChangeLanguage: @escaping () -> Void,
        onCallWaiter: @escaping () -> Void
    ) {
        self.orderVM = orderVM
        self._showModeDropdown = showModeDropdown
        self._showOptionsSheet = showOptionsSheet
        self.onBack = onBack
        self.onShowTracker = onShowTracker
        self.onShowTableInfo = onShowTableInfo
        self.onChangeLanguage = onChangeLanguage
        self.onCallWaiter = onCallWaiter
    }
    
    public var body: some View {
        HStack {
            // Left: Back button circle 44x44pt
            Button(action: {
                #if os(iOS)
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                #endif
                onBack()
            }) {
                Image(systemName: "chevron.left")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.appPrimaryText)
                    .frame(width: 44, height: 44)
                    .background(Color.appSecondarySystemGroupedBackground)
                    .clipShape(Circle())
                    .shadow(color: Color.black.opacity(0.04), radius: 6, x: 0, y: 2)
            }
            
            Spacer()
            
            // Center: Mode Dropdown Pill Trigger
            Button(action: {
                #if os(iOS)
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                #endif
                withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                    showModeDropdown.toggle()
                    if showModeDropdown { showOptionsSheet = false }
                }
            }) {
                HStack(spacing: 6) {
                    Text("MODE")
                        .font(.system(size: 15, weight: .heavy))
                        .foregroundColor(.appPrimaryText)
                    
                    Image(systemName: "chevron.down")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.appPrimaryText)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Color.clear)
            }
            
            Spacer()
            
            // Right: Ellipsis Menu Button circle 44x44pt
            Button(action: {
                #if os(iOS)
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                #endif
                withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                    showOptionsSheet.toggle()
                    if showOptionsSheet { showModeDropdown = false }
                }
            }) {
                Image(systemName: "ellipsis")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.appPrimaryText)
                    .frame(width: 44, height: 44)
                    .background(Color.appSecondarySystemGroupedBackground)
                    .clipShape(Circle())
                    .shadow(color: Color.black.opacity(0.04), radius: 6, x: 0, y: 2)
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 10)
        .background(Color.appSystemGroupedBackground)
        .overlay(alignment: .top) {
            // Mode Dropdown Overlay Menu
            if showModeDropdown {
                VStack(spacing: 0) {
                    Button(action: {
                        orderVM.currentMode = "chat"
                        withAnimation { showModeDropdown = false }
                    }) {
                        HStack {
                            Image(systemName: orderVM.currentMode == "chat" ? "checkmark" : "")
                                .font(.system(size: 12, weight: .bold))
                                .frame(width: 20)
                            Text("Chat")
                                .font(.system(size: 15, weight: .semibold))
                            Spacer()
                        }
                        .foregroundColor(.primary)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                    }
                    
                    Divider()
                    
                    Button(action: {
                        orderVM.currentMode = "menu"
                        withAnimation { showModeDropdown = false }
                    }) {
                        HStack {
                            Image(systemName: orderVM.currentMode == "menu" ? "checkmark" : "")
                                .font(.system(size: 12, weight: .bold))
                                .frame(width: 20)
                            Text("Menu")
                                .font(.system(size: 15, weight: .semibold))
                            Spacer()
                        }
                        .foregroundColor(.primary)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                    }
                }
                .frame(width: 140)
                .background(Color.appSecondarySystemGroupedBackground)
                .clipShape(RoundedRectangle(cornerRadius: 16))
                .shadow(color: Color.black.opacity(0.12), radius: 16, x: 0, y: 8)
                .padding(.top, 50)
            }
        }
        .overlay(alignment: .topTrailing) {
            // Ellipsis Action Popup Menu (iOS HIG Context Menu)
            if showOptionsSheet {
                VStack(spacing: 0) {
                    // Only show Live Tracker if order is active
                    if orderVM.orderTrackingActive {
                        Button(action: {
                            withAnimation { showOptionsSheet = false }
                            onShowTracker()
                        }) {
                            HStack(spacing: 10) {
                                Image(systemName: "cup.and.saucer.fill")
                                    .foregroundColor(Color(hex: "D97706"))
                                Text("Lacak Pesanan Saya (Live)")
                                    .font(.system(size: 13, weight: .semibold))
                                Spacer()
                            }
                            .foregroundColor(.primary)
                            .padding(.horizontal, 14)
                            .padding(.vertical, 12)
                        }
                        Divider()
                    }
                    
                    Button(action: {
                        withAnimation { showOptionsSheet = false }
                        onShowTableInfo()
                    }) {
                        HStack(spacing: 10) {
                            Image(systemName: "checkmark.shield.fill")
                                .foregroundColor(Color(hex: "10B981"))
                            Text("Meja \(orderVM.tableSession?.tableId ?? 5) [Terverifikasi]")
                                .font(.system(size: 13, weight: .semibold))
                            Spacer()
                        }
                        .foregroundColor(.primary)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 12)
                    }
                    
                    Divider()
                    
                    Button(action: {
                        withAnimation { showOptionsSheet = false }
                        onChangeLanguage()
                    }) {
                        HStack(spacing: 10) {
                            Image(systemName: "globe")
                                .foregroundColor(.primary)
                            Text("Ganti Bahasa")
                                .font(.system(size: 13, weight: .semibold))
                            Spacer()
                        }
                        .foregroundColor(.primary)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 12)
                    }
                    
                    Divider()
                    
                    Button(action: {
                        withAnimation { showOptionsSheet = false }
                        onCallWaiter()
                    }) {
                        HStack(spacing: 10) {
                            Image(systemName: "bell.fill")
                                .foregroundColor(Color(hex: "D97706"))
                            Text("Panggil Pelayan")
                                .font(.system(size: 13, weight: .semibold))
                            Spacer()
                        }
                        .foregroundColor(.primary)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 12)
                    }
                }
                .frame(width: 230)
                .background(Color.appSecondarySystemGroupedBackground)
                .clipShape(RoundedRectangle(cornerRadius: 18))
                .shadow(color: Color.black.opacity(0.14), radius: 20, x: 0, y: 8)
                .padding(.top, 50)
                .padding(.trailing, 20)
            }
        }
    }
}
