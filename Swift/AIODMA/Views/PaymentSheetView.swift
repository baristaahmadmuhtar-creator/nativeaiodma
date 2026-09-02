import SwiftUI
import PassKit

public struct PaymentSheetView: View {
    @ObservedObject var orderVM: OrderViewModel
    @State private var selectedMethod: PaymentMethod = .bibd
    var onProcessPayment: (PaymentMethod) -> Void
    
    public init(orderVM: OrderViewModel, onProcessPayment: @escaping (PaymentMethod) -> Void) {
        self.orderVM = orderVM
        self.onProcessPayment = onProcessPayment
    }
    
    public var body: some View {
        VStack(spacing: 24) {
            // Drag Handle
            Capsule()
                .fill(Color.appTertiaryLabel)
                .frame(width: 44, height: 5)
                .padding(.top, 12)
            
            // Order Summary Box (Home 12.JPG)
            VStack(spacing: 14) {
                ForEach(orderVM.cart) { item in
                    HStack(spacing: 12) {
                        Text("\(item.quantity)x")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(.appPrimaryText)
                        
                        Image(item.image)
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(width: 44, height: 44)
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        
                        VStack(alignment: .leading, spacing: 2) {
                            Text(item.name)
                                .font(.system(size: 13, weight: .bold))
                                .foregroundColor(.appPrimaryText)
                            Text(item.subtext ?? "Normal")
                                .font(.system(size: 11, weight: .medium))
                                .foregroundColor(Color.appSecondaryLabel)
                        }
                        
                        Spacer()
                        
                        Text(item.formattedTotalPrice)
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(.appPrimaryText)
                    }
                }
                
                Divider()
                
                VStack(spacing: 6) {
                    HStack {
                        Text("Subtotal")
                            .font(.system(size: 13, weight: .medium))
                        Spacer()
                        Text("Rp \(orderVM.subtotal)")
                            .font(.system(size: 13, weight: .bold))
                    }
                    HStack {
                        Text("Pajak (10%)")
                            .font(.system(size: 13, weight: .medium))
                        Spacer()
                        Text("Rp \(orderVM.tax)")
                            .font(.system(size: 13, weight: .bold))
                    }
                    HStack {
                        Text("Total")
                            .font(.system(size: 15, weight: .heavy))
                        Spacer()
                        Text("Rp \(orderVM.total)")
                            .font(.system(size: 15, weight: .heavy))
                    }
                    .padding(.top, 4)
                }
            }
            .padding(18)
            .background(Color.appSecondarySystemGroupedBackground)
            .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
            .shadow(color: Color.black.opacity(0.04), radius: 10, x: 0, y: 3)
            
            // Payment Methods Grid (BIBD, BAIDURI, POCKET, CASH)
            VStack(alignment: .leading, spacing: 10) {
                Text("Pilih Pembayaran")
                    .font(.system(size: 16, weight: .heavy))
                    .foregroundColor(.appPrimaryText)
                
                Text("[orderan akan diproses setalah pembayaran selesai]")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(Color.appSecondaryLabel)
                
                HStack(spacing: 10) {
                    paymentMethodCard(method: .bibd, title: "BIBD", icon: "qrcode", color: .appPrimaryText)
                    paymentMethodCard(method: .baiduri, title: "BAIDURI", icon: "circle.circle", color: Color(hex: "7C3AED"))
                    paymentMethodCard(method: .pocket, title: "POCKET", icon: "wallet.pass.fill", color: Color(hex: "0284C7"))
                    paymentMethodCard(method: .cash, title: "CASH", icon: "banknote", color: .appPrimaryText)
                }
            }
            
            // Process Payment Button
            Button(action: {
                #if os(iOS)
                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                #endif
                onProcessPayment(selectedMethod)
            }) {
                Text("Proses Pembayaran")
                    .font(.system(size: 16, weight: .heavy))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 58)
                    .background(Color.appPrimaryText)
                    .clipShape(Capsule())
                    .shadow(color: Color.black.opacity(0.18), radius: 12, x: 0, y: 4)
            }
            .padding(.bottom, 24)
        }
        .padding(.horizontal, 20)
        .background(Color.appSystemGroupedBackground)
    }
    
    private func paymentMethodCard(method: PaymentMethod, title: String, icon: String, color: Color) -> some View {
        let isSelected = selectedMethod == method
        
        return Button(action: {
            #if os(iOS)
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            #endif
            selectedMethod = method
        }) {
            VStack(spacing: 10) {
                Image(systemName: icon)
                    .font(.system(size: 22, weight: .semibold))
                    .foregroundColor(color)
                    .frame(height: 28)
                
                Text(title)
                    .font(.system(size: 11, weight: .heavy))
                    .foregroundColor(.appPrimaryText)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 16)
            .background(Color.appSecondarySystemGroupedBackground)
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 18, style: .continuous)
                    .stroke(isSelected ? Color.appPrimaryText : Color.appSeparator, lineWidth: isSelected ? 2 : 1)
            )
            .shadow(color: Color.black.opacity(isSelected ? 0.08 : 0.02), radius: 6, x: 0, y: 2)
        }
        .buttonStyle(PlainButtonStyle())
    }
}
