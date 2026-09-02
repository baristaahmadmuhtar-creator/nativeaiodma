import SwiftUI

public struct OrderSuccessView: View {
    var orderNumber: String = "#1K04"
    var onTrackOrder: () -> Void
    var onSaveReceipt: () -> Void
    var onBackToChat: () -> Void
    
    public init(
        orderNumber: String = "#1K04",
        onTrackOrder: @escaping () -> Void,
        onSaveReceipt: @escaping () -> Void,
        onBackToChat: @escaping () -> Void
    ) {
        self.orderNumber = orderNumber
        self.onTrackOrder = onTrackOrder
        self.onSaveReceipt = onSaveReceipt
        self.onBackToChat = onBackToChat
    }
    
    public var body: some View {
        VStack(spacing: 0) {
            Spacer()
            
            // Success Checkmark Circle (Home 14.JPG)
            VStack(spacing: 20) {
                Image(systemName: "checkmark")
                    .font(.system(size: 36, weight: .bold))
                    .foregroundColor(.appPrimaryText)
                    .frame(width: 80, height: 80)
                    .background(Color.white)
                    .clipShape(Circle())
                    .overlay(Circle().stroke(Color.appPrimaryText, lineWidth: 2))
                    .shadow(color: Color.black.opacity(0.06), radius: 16, x: 0, y: 8)
                
                Text("Pesanan Berhasil")
                    .font(.system(size: 22, weight: .black))
                    .foregroundColor(.appPrimaryText)
                
                Text("Pesanan \(orderNumber) sedang\ndiproses. Mohon tunggu.")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.appPrimaryText)
                    .multilineTextAlignment(.center)
                    .lineSpacing(4)
            }
            
            Spacer()
            
            // Action Buttons
            VStack(spacing: 12) {
                HStack(spacing: 12) {
                    Button(action: {
                        #if os(iOS)
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        #endif
                        onTrackOrder()
                    }) {
                        Text("Lacak Pesanan")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 52)
                            .background(Color.appPrimaryText)
                            .clipShape(Capsule())
                            .shadow(color: Color.black.opacity(0.12), radius: 8, x: 0, y: 3)
                    }
                    
                    Button(action: {
                        #if os(iOS)
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        #endif
                        onSaveReceipt()
                    }) {
                        Text("Simpan Recipt")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity)
                            .frame(height: 52)
                            .background(Color(hex: "2D2D2D"))
                            .clipShape(Capsule())
                    }
                }
                
                Button(action: {
                    #if os(iOS)
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    #endif
                    onBackToChat()
                }) {
                    Text("Kembali ke Chat")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.appPrimaryText)
                        .frame(maxWidth: .infinity)
                        .frame(height: 52)
                        .background(Color.white)
                        .clipShape(Capsule())
                        .overlay(Capsule().stroke(Color.appPrimaryText, lineWidth: 1))
                }
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 36)
        }
        .background(Color.appSystemGroupedBackground.ignoresSafeArea())
    }
}
