import SwiftUI

public struct LiveActivityBannerView: View {
    @ObservedObject var orderVM: OrderViewModel
    var onTap: () -> Void
    
    @State private var dragOffset: CGSize = .zero
    @State private var isDismissed: Bool = false
    
    public init(orderVM: OrderViewModel, onTap: @escaping () -> Void) {
        self.orderVM = orderVM
        self.onTap = onTap
    }
    
    public var body: some View {
        if !isDismissed {
            HStack(spacing: 12) {
                // Leading Icon Capsule
                ZStack {
                    RoundedRectangle(cornerRadius: 10)
                        .fill(Color.white.opacity(0.12))
                        .frame(width: 34, height: 34)
                    
                    Image(systemName: iconName)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(.white)
                }
                
                // Meta Info
                VStack(alignment: .leading, spacing: 1) {
                    Text("Meja \(orderVM.tableSession?.tableId ?? 5) • Order \(orderVM.activeOrderNumber)")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.white)
                    
                    Text(subDescription)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundColor(Color(hex: "94A3B8"))
                        .lineLimit(1)
                }
                
                Spacer()
                
                // Status Pill
                Text(orderVM.activeOrderStatus.rawValue)
                    .font(.system(size: 11, weight: .heavy))
                    .foregroundColor(statusTextColor)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(statusBgColor)
                    .clipShape(RoundedRectangle(cornerRadius: 6))
                
                Image(systemName: "chevron.right")
                    .font(.system(size: 11, weight: .bold))
                    .foregroundColor(Color(hex: "94A3B8"))
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 10)
            .background(Color.black)
            .clipShape(RoundedRectangle(cornerRadius: 22))
            .overlay(
                RoundedRectangle(cornerRadius: 22)
                    .stroke(Color.white.opacity(0.14), lineWidth: 1)
            )
            .shadow(color: Color.black.opacity(0.45), radius: 16, x: 0, y: 8)
            .offset(x: dragOffset.width, y: dragOffset.height < 0 ? dragOffset.height * 0.8 : dragOffset.height * 0.2)
            .opacity(max(0.2, 1.0 - Double(abs(dragOffset.width) + abs(dragOffset.height)) / 200.0))
            .gesture(
                DragGesture()
                    .onChanged { gesture in
                        dragOffset = gesture.translation
                    }
                    .onEnded { gesture in
                        let dx = gesture.translation.width
                        let dy = gesture.translation.height
                        
                        if dy < -35 {
                            // Swipe Up -> Dismiss into notch
                            #if os(iOS)
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                            #endif
                            withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                                dragOffset = CGSize(width: 0, height: -100)
                                isDismissed = true
                            }
                        } else if dx < -45 {
                            // Swipe Left -> Dismiss off-screen left
                            #if os(iOS)
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                            #endif
                            withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                                dragOffset = CGSize(width: -400, height: 0)
                                isDismissed = true
                            }
                        } else if dx > 45 {
                            // Swipe Right -> Dismiss off-screen right
                            #if os(iOS)
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                            #endif
                            withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                                dragOffset = CGSize(width: 400, height: 0)
                                isDismissed = true
                            }
                        } else {
                            // Spring back to original center
                            withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                                dragOffset = .zero
                            }
                            // Minimal movement -> Tap to open sheet
                            if abs(dx) < 6 && abs(dy) < 6 {
                                #if os(iOS)
                                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                                #endif
                                onTap()
                            }
                        }
                    }
            )
            .padding(.horizontal, 16)
            .transition(.asymmetric(
                insertion: .move(edge: .top).combined(with: .opacity).combined(with: .scale(scale: 0.85)),
                removal: .move(edge: .top).combined(with: .opacity).combined(with: .scale(scale: 0.7))
            ))
        }
    }
    
    private var iconName: String {
        switch orderVM.activeOrderStatus {
        case .received: return "cup.and.saucer.fill"
        case .preparing: return "flame.fill"
        case .ready: return "sparkles"
        case .completed: return "checkmark.circle.fill"
        case .cancelled: return "xmark.circle.fill"
        }
    }
    
    private var subDescription: String {
        switch orderVM.activeOrderStatus {
        case .received: return "Pesanan diterima & masuk antrean dapur"
        case .preparing: return "Sedang diracik oleh Barista di dapur"
        case .ready: return "Siap disajikan! Tunggu pelayan / ambil di bar"
        case .completed: return "Pesanan selesai dinikmati. Terima kasih!"
        case .cancelled: return "Pesanan telah dibatalkan."
        }
    }
    
    private var statusTextColor: Color {
        switch orderVM.activeOrderStatus {
        case .received: return Color(hex: "60A5FA")
        case .preparing: return Color(hex: "FBBF24")
        case .ready: return Color(hex: "34D399")
        case .completed: return Color(hex: "F1F5F9")
        case .cancelled: return Color.red
        }
    }
    
    private var statusBgColor: Color {
        switch orderVM.activeOrderStatus {
        case .received: return Color(hex: "3B82F6").opacity(0.2)
        case .preparing: return Color(hex: "F59E0B").opacity(0.2)
        case .ready: return Color(hex: "10B981").opacity(0.2)
        case .completed: return Color.white.opacity(0.12)
        case .cancelled: return Color.red.opacity(0.2)
        }
    }
}
