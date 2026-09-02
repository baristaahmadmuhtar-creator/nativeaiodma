import SwiftUI

public struct OrderTrackerSheetView: View {
    @ObservedObject var orderVM: OrderViewModel
    var onClose: () -> Void
    var onCallWaiter: () -> Void
    var onOrderMore: () -> Void
    
    public init(
        orderVM: OrderViewModel,
        onClose: @escaping () -> Void,
        onCallWaiter: @escaping () -> Void,
        onOrderMore: @escaping () -> Void
    ) {
        self.orderVM = orderVM
        self.onClose = onClose
        self.onCallWaiter = onCallWaiter
        self.onOrderMore = onOrderMore
    }
    
    public var body: some View {
        VStack(spacing: 0) {
            // Drag Handle
            Capsule()
                .fill(Color.secondary.opacity(0.3))
                .frame(width: 36, height: 5)
                .padding(.top, 10)
                .padding(.bottom, 16)
            
            // Header Row
            HStack(spacing: 12) {
                ZStack {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color(hex: "FFFBEB"))
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(hex: "FDE68A"), lineWidth: 1))
                        .frame(width: 44, height: 44)
                    
                    Image(systemName: "cup.and.saucer.fill")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(Color(hex: "D97706"))
                }
                
                VStack(alignment: .leading, spacing: 2) {
                    Text("Lacak Pesanan Live")
                        .font(.system(size: 17, weight: .black))
                        .foregroundColor(.primary)
                    Text("Order \(orderVM.activeOrderNumber) • Meja \(orderVM.tableSession?.tableId ?? 5)")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                // Status Pill
                Text(orderVM.activeOrderStatus.rawValue)
                    .font(.system(size: 11, weight: .heavy))
                    .foregroundColor(statusColor)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(statusBgColor)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(statusColor.opacity(0.3), lineWidth: 1))
            }
            .padding(.horizontal, 20)
            .padding(.bottom, 20)
            
            // 4-Step Timeline
            VStack(spacing: 14) {
                timelineStepRow(
                    stepNum: 1,
                    title: "1. Pesanan Diterima",
                    desc: "Masuk ke antrean dapur",
                    iconName: "checkmark",
                    isActive: isStepActive(1),
                    color: Color(hex: "2563EB")
                )
                
                timelineStepRow(
                    stepNum: 2,
                    title: "2. Sedang Diracik",
                    desc: "Barista & chef sedang menyiapkan",
                    iconName: "flame.fill",
                    isActive: isStepActive(2),
                    color: Color(hex: "D97706")
                )
                
                timelineStepRow(
                    stepNum: 3,
                    title: "3. Siap Disajikan",
                    desc: "Diantar ke Meja / Ambil di Bar",
                    iconName: "sparkles",
                    isActive: isStepActive(3),
                    color: Color(hex: "10B981")
                )
                
                timelineStepRow(
                    stepNum: 4,
                    title: "4. Selesai",
                    desc: "Selesai dinikmati",
                    iconName: "checkmark.circle.fill",
                    isActive: isStepActive(4),
                    color: Color(hex: "475569")
                )
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 14)
            .background(Color.appSecondarySystemGroupedBackground)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .padding(.horizontal, 16)
            
            // Items Breakdown Section
            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    Text("Rincian Menu Pesanan")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(.secondary)
                    
                    Spacer()
                    
                    Text("LUNAS • BIBD")
                        .font(.system(size: 10, weight: .heavy))
                        .foregroundColor(Color(hex: "059669"))
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color(hex: "ECFDF5"))
                        .clipShape(RoundedRectangle(cornerRadius: 4))
                }
                
                ScrollView {
                    VStack(spacing: 8) {
                        if !orderVM.cart.isEmpty {
                            ForEach(orderVM.cart) { item in
                                HStack {
                                    VStack(alignment: .leading, spacing: 1) {
                                        Text("\(item.quantity)x \(item.name)")
                                            .font(.system(size: 13, weight: .semibold))
                                            .foregroundColor(.primary)
                                        if let sub = item.subtext, !sub.isEmpty {
                                            Text(sub)
                                                .font(.system(size: 11))
                                                .foregroundColor(.secondary)
                                        }
                                    }
                                    Spacer()
                                    Text("Rp \(item.totalPrice.formattedWithSeparator)")
                                        .font(.system(size: 13, weight: .bold))
                                }
                                .padding(.vertical, 2)
                                Divider()
                            }
                        } else {
                            Text("Menu sedang disiapkan di dapur.")
                                .font(.system(size: 12))
                                .foregroundColor(.secondary)
                                .frame(maxWidth: .infinity, alignment: .center)
                                .padding(.vertical, 6)
                        }
                    }
                }
                .frame(maxHeight: 120)
                
                // Total Row
                HStack {
                    Text("Total Pesanan")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.primary)
                    Spacer()
                    Text("Rp \(orderVM.total.formattedWithSeparator)")
                        .font(.system(size: 15, weight: .heavy))
                        .foregroundColor(.primary)
                }
                .padding(.top, 4)
            }
            .padding(14)
            .background(Color.appSecondarySystemGroupedBackground)
            .clipShape(RoundedRectangle(cornerRadius: 16))
            .padding(.horizontal, 16)
            .padding(.top, 14)
            
            // Action Buttons
            HStack(spacing: 10) {
                Button(action: {
                    #if os(iOS)
                    UINotificationFeedbackGenerator().notificationOccurred(.success)
                    #endif
                    onCallWaiter()
                }) {
                    HStack(spacing: 6) {
                        Image(systemName: "bell.fill")
                            .font(.system(size: 13, weight: .semibold))
                        Text("Panggil Pelayan")
                            .font(.system(size: 13, weight: .bold))
                    }
                    .foregroundColor(.primary)
                    .frame(maxWidth: .infinity)
                    .frame(height: 44)
                    .background(Color.appSecondarySystemGroupedBackground)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.secondary.opacity(0.2), lineWidth: 1))
                }
                
                Button(action: {
                    #if os(iOS)
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    #endif
                    onOrderMore()
                }) {
                    HStack(spacing: 6) {
                        Image(systemName: "plus")
                            .font(.system(size: 13, weight: .bold))
                        Text("Pesan Tambahan")
                            .font(.system(size: 13, weight: .bold))
                    }
                    .foregroundColor(.primary)
                    .frame(maxWidth: .infinity)
                    .frame(height: 44)
                    .background(Color.appSecondarySystemGroupedBackground)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color.secondary.opacity(0.2), lineWidth: 1))
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 12)
            
            // Close Button
            Button(action: {
                #if os(iOS)
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                #endif
                onClose()
            }) {
                Text("Tutup Pelacak")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 48)
                    .background(Color.appPrimaryAccent)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
            }
            .padding(.horizontal, 16)
            .padding(.top, 10)
            .padding(.bottom, 20)
        }
        .background(Color.appSystemGroupedBackground)
    }
    
    // MARK: - Timeline Step Row
    private func timelineStepRow(stepNum: Int, title: String, desc: String, iconName: String, isActive: Bool, color: Color) -> some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(isActive ? color.opacity(0.15) : Color.appTertiarySystemGroupedBackground)
                    .frame(width: 32, height: 32)
                    .overlay(
                        Circle().stroke(isActive ? color : Color.secondary.opacity(0.3), lineWidth: 2)
                    )
                
                Image(systemName: iconName)
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(isActive ? color : .secondary)
            }
            
            VStack(alignment: .leading, spacing: 1) {
                Text(title)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(isActive ? .primary : .secondary)
                Text(desc)
                    .font(.system(size: 11))
                    .foregroundColor(.secondary)
            }
            
            Spacer()
        }
        .opacity(isActive ? 1.0 : 0.45)
    }
    
    private func isStepActive(_ step: Int) -> Bool {
        switch orderVM.activeOrderStatus {
        case .received: return step <= 1
        case .preparing: return step <= 2
        case .ready: return step <= 3
        case .completed: return step <= 4
        case .cancelled: return false
        }
    }
    
    private var statusColor: Color {
        switch orderVM.activeOrderStatus {
        case .received: return Color(hex: "2563EB")
        case .preparing: return Color(hex: "D97706")
        case .ready: return Color(hex: "059669")
        case .completed: return Color(hex: "475569")
        case .cancelled: return Color.red
        }
    }
    
    private var statusBgColor: Color {
        switch orderVM.activeOrderStatus {
        case .received: return Color(hex: "EFF6FF")
        case .preparing: return Color(hex: "FFFBEB")
        case .ready: return Color(hex: "ECFDF5")
        case .completed: return Color(hex: "F8FAFC")
        case .cancelled: return Color.red.opacity(0.1)
        }
    }
}
