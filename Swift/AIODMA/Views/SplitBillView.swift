import SwiftUI

@available(iOS 16.0, macOS 13.0, *)
public struct SplitBillView: View {
    @ObservedObject var orderVM: OrderViewModel
    @State private var seatCount: Int = 2
    @Environment(\.dismiss) private var dismiss
    
    public init(orderVM: OrderViewModel) {
        self.orderVM = orderVM
    }
    
    public var body: some View {
        VStack(spacing: 20) {
            Capsule()
                .fill(Color.appTertiaryLabel)
                .frame(width: 44, height: 5)
                .padding(.top, 12)
            
            VStack(alignment: .leading, spacing: 6) {
                Text("Split Bill (Pisah Bayar Multi-Seat)")
                    .font(.system(size: 18, weight: .heavy))
                    .foregroundColor(.appPrimaryText)
                
                Text("Bagi tagihan Meja 5 untuk setiap kursi secara mandiri.")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundColor(Color.appSecondaryLabel)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            
            // Seat Count Selector
            HStack(spacing: 10) {
                ForEach([2, 3, 4, 5], id: \.self) { count in
                    Button(action: {
                        #if os(iOS)
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        #endif
                        seatCount = count
                    }) {
                        Text("\(count) Orang")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(seatCount == count ? .white : Color.appPrimaryText)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(seatCount == count ? Color.appPrimaryText : Color.appSystemGroupedBackground)
                            .clipShape(Capsule())
                    }
                }
            }
            
            // Split Seats List with Individual QRs
            ScrollView {
                VStack(spacing: 12) {
                    let perSeat = orderVM.total / seatCount
                    ForEach(1...seatCount, id: \.self) { i in
                        let seatLetter = String(UnicodeScalar(64 + i)!)
                        HStack {
                            HStack(spacing: 12) {
                                Text(seatLetter)
                                    .font(.system(size: 14, weight: .black))
                                    .foregroundColor(.white)
                                    .frame(width: 36, height: 36)
                                    .background(Color.appPrimaryText)
                                    .clipShape(Circle())
                                
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("Seat \(seatLetter) (Meja 5)")
                                        .font(.system(size: 14, weight: .bold))
                                    Text("QR Bayar Terpisah")
                                        .font(.system(size: 11, weight: .medium))
                                        .foregroundColor(Color.appSecondaryLabel)
                                }
                            }
                            
                            Spacer()
                            
                            VStack(alignment: .trailing, spacing: 2) {
                                Text("Rp \(perSeat)")
                                    .font(.system(size: 14, weight: .heavy))
                                
                                HStack(spacing: 4) {
                                    Image(systemName: "qrcode")
                                        .font(.system(size: 11))
                                    Text("Scan QR")
                                        .font(.system(size: 11, weight: .bold))
                                }
                                .foregroundColor(Color.appEmerald)
                            }
                        }
                        .padding(14)
                        .background(Color.appSystemGroupedBackground)
                        .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
                    }
                }
            }
            .frame(maxHeight: 280)
            
            Button(action: {
                dismiss()
            }) {
                Text("Tutup Split Bill")
                    .font(.system(size: 16, weight: .heavy))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 54)
                    .background(Color.appPrimaryText)
                    .clipShape(Capsule())
            }
            .padding(.bottom, 20)
        }
        .padding(.horizontal, 20)
        .presentationDetents([.fraction(0.65)])
    }
}
