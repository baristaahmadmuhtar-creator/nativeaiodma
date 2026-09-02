import SwiftUI

@available(iOS 16.0, macOS 13.0, *)
public struct CartBottomSheetView: View {
    @ObservedObject var orderVM: OrderViewModel
    var onProceedToPayment: () -> Void
    
    public init(orderVM: OrderViewModel, onProceedToPayment: @escaping () -> Void) {
        self.orderVM = orderVM
        self.onProceedToPayment = onProceedToPayment
    }
    
    public var body: some View {
        VStack(spacing: 20) {
            // Drag Handle
            Capsule()
                .fill(Color.appTertiaryLabel)
                .frame(width: 44, height: 5)
                .padding(.top, 12)
            
            // Cart Items List
            ScrollView {
                VStack(spacing: 16) {
                    ForEach(orderVM.cart) { item in
                        HStack(spacing: 14) {
                            Image(item.image)
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                                .frame(width: 58, height: 58)
                                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                            
                            VStack(alignment: .leading, spacing: 4) {
                                Text(item.name)
                                    .font(.system(size: 15, weight: .bold))
                                    .foregroundColor(.appPrimaryText)
                                
                                Text(item.formattedTotalPrice)
                                    .font(.system(size: 14, weight: .semibold))
                                    .foregroundColor(.appPrimaryText)
                            }
                            
                            Spacer()
                            
                            HStack(spacing: 10) {
                                Text("x \(item.quantity)")
                                    .font(.system(size: 15, weight: .bold))
                                    .foregroundColor(.appPrimaryText)
                                
                                HStack(spacing: 8) {
                                    Button(action: {
                                        orderVM.updateQuantity(id: item.id, delta: -1)
                                    }) {
                                        Text("-")
                                            .font(.system(size: 14, weight: .bold))
                                            .frame(width: 24, height: 24)
                                            .background(Color.white)
                                            .clipShape(Circle())
                                    }
                                    
                                    Button(action: {
                                        orderVM.updateQuantity(id: item.id, delta: 1)
                                    }) {
                                        Text("+")
                                            .font(.system(size: 14, weight: .bold))
                                            .frame(width: 24, height: 24)
                                            .background(Color.white)
                                            .clipShape(Circle())
                                    }
                                }
                                .padding(4)
                                .background(Color.appSystemGroupedBackground)
                                .clipShape(Capsule())
                            }
                        }
                        .padding(.bottom, 12)
                        .overlay(alignment: .bottom) {
                            Divider()
                        }
                    }
                }
            }
            .frame(maxHeight: 280)
            
            // Subtotal, Taxes, Total
            VStack(spacing: 10) {
                HStack {
                    Text("Subtotal")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.appPrimaryText)
                    Spacer()
                    Text("Rp \(orderVM.subtotal)")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.appPrimaryText)
                }
                
                HStack {
                    Text("Taxes (+)")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundColor(.appPrimaryText)
                    Spacer()
                    Text("Rp \(orderVM.tax)")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.appPrimaryText)
                }
                
                Divider()
                    .padding(.vertical, 4)
                
                HStack {
                    Text("Total")
                        .font(.system(size: 16, weight: .heavy))
                        .foregroundColor(.appPrimaryText)
                    Spacer()
                    Text("Rp \(orderVM.total)")
                        .font(.system(size: 16, weight: .heavy))
                        .foregroundColor(.appPrimaryText)
                }
            }
            .padding(.top, 8)
            
            // Proceed Button
            Button(action: {
                #if os(iOS)
                UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                #endif
                onProceedToPayment()
            }) {
                Text("Lanjut ke Pembayaran")
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
        .padding(.horizontal, 24)
        .background(Color.appSecondarySystemGroupedBackground)
        .presentationDetents([.fraction(0.58), .large])
    }
}
