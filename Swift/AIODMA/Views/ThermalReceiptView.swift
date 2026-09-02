import SwiftUI

// MARK: - Serrated Receipt Tear Shape
public struct ReceiptTearShape: Shape {
    public var toothWidth: CGFloat = 16
    public var toothHeight: CGFloat = 8
    
    public func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: 0, y: 0))
        path.addLine(to: CGPoint(x: rect.maxX, y: 0))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.maxY - toothHeight))
        
        let teethCount = Int(rect.width / toothWidth)
        for i in (0..<teethCount).reversed() {
            let x1 = CGFloat(i) * toothWidth + (toothWidth / 2)
            let x2 = CGFloat(i) * toothWidth
            path.addLine(to: CGPoint(x: x1, y: rect.maxY))
            path.addLine(to: CGPoint(x: x2, y: rect.maxY - toothHeight))
        }
        
        path.addLine(to: CGPoint(x: 0, y: 0))
        path.closeSubpath()
        return path
    }
}

public struct ThermalReceiptView: View {
    @ObservedObject var orderVM: OrderViewModel
    var orderNumber: String = "#A8F29K"
    var paymentMethod: String = "BIBD"
    
    public init(orderVM: OrderViewModel, orderNumber: String = "#A8F29K", paymentMethod: String = "BIBD") {
        self.orderVM = orderVM
        self.orderNumber = orderNumber
        self.paymentMethod = paymentMethod
    }
    
    public var body: some View {
        ScrollView {
            VStack(spacing: 0) {
                // Printer Slot Slit (Top)
                Capsule()
                    .fill(Color.black)
                    .frame(width: 320, height: 10)
                    .shadow(color: Color.black.opacity(0.5), radius: 6, x: 0, y: 4)
                    .padding(.bottom, -5)
                    .zIndex(10)
                
                // Thermal Paper Body (Home 15.JPG)
                VStack(spacing: 16) {
                    Group {
                        receiptHeaderSection
                        dashedDivider
                        receiptOrderMetaSection
                        Divider()
                        receiptItemsSection
                    }
                    
                    Group {
                        dashedDivider
                        receiptTotalsSection
                        Divider()
                        receiptPaymentSection
                        dashedDivider
                        receiptFooterSection
                    }
                }
                .padding(24)
                .background(Color.white)
                .clipShape(ReceiptTearShape())
                .shadow(color: Color.black.opacity(0.08), radius: 16, x: 0, y: 8)
                .padding(.horizontal, 20)
                
                // Print / Share Button
                Button(action: {
                    #if os(iOS)
                    UIImpactFeedbackGenerator(style: .medium).impactOccurred()
                    #endif
                }) {
                    HStack(spacing: 8) {
                        Image(systemName: "printer.fill")
                        Text("AirPrint / Simpan PDF")
                    }
                    .font(.system(size: 14, weight: .bold))
                    .foregroundColor(.white)
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
                    .background(Color.appPrimaryText)
                    .clipShape(Capsule())
                }
                .padding(.horizontal, 24)
                .padding(.top, 24)
                .padding(.bottom, 40)
            }
        }
        .background(Color.appSystemGroupedBackground.ignoresSafeArea())
    }
    
    // MARK: - Section ViewBuilders
    private var receiptHeaderSection: some View {
        VStack(spacing: 6) {
            Image(systemName: "cup.and.saucer.fill")
                .font(.system(size: 28))
                .foregroundColor(Color(hex: "382115"))
            
            Text("AIODMA")
                .font(.system(size: 18, weight: .black))
                .tracking(2)
                .foregroundColor(.appPrimaryText)
            
            Text("— COFFEE —")
                .font(.system(size: 10, weight: .bold))
                .tracking(4)
                .foregroundColor(Color.appSecondaryLabel)
            
            HStack(spacing: 6) {
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 16))
                    .foregroundColor(Color.appEmerald)
                
                Text("PEMBAYARAN BERHASIL")
                    .font(.system(size: 13, weight: .heavy))
                    .foregroundColor(Color.appEmerald)
            }
            .padding(.top, 4)
            
            Text("Pesanan Anda telah diterima")
                .font(.system(size: 12, weight: .medium))
                .foregroundColor(Color.appSecondaryLabel)
        }
    }
    
    private var receiptOrderMetaSection: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text("Order")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(Color.appSecondaryLabel)
                Text(orderNumber)
                    .font(.system(size: 18, weight: .black))
                    .foregroundColor(.appPrimaryText)
            }
            
            Spacer()
            
            Text("13 Agu 2026\n12:42")
                .font(.system(size: 12, weight: .semibold))
                .foregroundColor(Color.appSecondaryLabel)
                .multilineTextAlignment(.trailing)
        }
    }
    
    private var receiptItemsSection: some View {
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
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text(item.name)
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(.appPrimaryText)
                        Text(item.subtext ?? "Es")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundColor(Color.appSecondaryLabel)
                    }
                    
                    Spacer()
                    
                    Text(item.formattedTotalPrice)
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.appPrimaryText)
                }
            }
        }
    }
    
    private var receiptTotalsSection: some View {
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
            dashedDivider
            HStack {
                Text("TOTAL")
                    .font(.system(size: 15, weight: .heavy))
                Spacer()
                Text("Rp \(orderVM.total)")
                    .font(.system(size: 16, weight: .heavy))
            }
        }
    }
    
    private var receiptPaymentSection: some View {
        HStack {
            VStack(alignment: .leading, spacing: 4) {
                Text("Pembayaran")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(Color.appSecondaryLabel)
                HStack(spacing: 6) {
                    Image(systemName: "qrcode")
                        .font(.system(size: 16, weight: .bold))
                    Text(paymentMethod)
                        .font(.system(size: 14, weight: .black))
                }
            }
            Spacer()
            Text("Pembayaran berhasil")
                .font(.system(size: 10, weight: .heavy))
                .foregroundColor(Color(hex: "059669"))
                .padding(.horizontal, 8)
                .padding(.vertical, 4)
                .background(Color(hex: "ECFDF5"))
                .clipShape(Capsule())
        }
    }
    
    private var receiptFooterSection: some View {
        VStack(spacing: 4) {
            Image(systemName: "heart")
                .font(.system(size: 14, weight: .semibold))
            Text("Terima kasih!")
                .font(.system(size: 13, weight: .heavy))
            Text("Sampai jumpa kembali")
                .font(.system(size: 11, weight: .medium))
                .foregroundColor(Color.appSecondaryLabel)
        }
        .padding(.bottom, 20)
    }
    
    private var dashedDivider: some View {
        Line()
            .stroke(style: StrokeStyle(lineWidth: 1, dash: [4]))
            .frame(height: 1)
            .foregroundColor(Color.appSeparator)
    }
}

private struct Line: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: 0, y: 0))
        path.addLine(to: CGPoint(x: rect.width, y: 0))
        return path
    }
}
