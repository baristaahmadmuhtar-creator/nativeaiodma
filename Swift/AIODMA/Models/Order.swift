import Foundation

// MARK: - Order Status
public enum OrderStatus: String, Codable, CaseIterable {
    case received = "Diterima"
    case preparing = "Sedang Diracik"
    case ready = "Siap Disajikan"
    case completed = "Selesai"
    case cancelled = "Dibatalkan"
}

// MARK: - Payment Method
public enum PaymentMethod: String, Codable, CaseIterable, Identifiable {
    case bibd = "BIBD"
    case baiduri = "BAIDURI"
    case pocket = "POCKET"
    case cash = "CASH"
    case applePay = "Apple Pay"
    case qris = "QRIS"
    
    public var id: String { rawValue }
    
    public var iconName: String {
        switch self {
        case .bibd: return "qrcode"
        case .baiduri: return "circle.circle"
        case .pocket: return "wallet.pass"
        case .cash: return "banknote"
        case .applePay: return "applelogo"
        case .qris: return "qrcode.viewfinder"
        }
    }
}

// MARK: - Order Entity
public struct Order: Identifiable, Codable {
    public var id: String
    public var orderNumber: String
    public var tableId: Int
    public var tableName: String
    public var seatId: String?
    public var outletId: String
    public var items: [CartItem]
    public var subtotal: Int
    public var tax: Int
    public var total: Int
    public var paymentMethod: PaymentMethod
    public var paymentStatus: String
    public var orderStatus: OrderStatus
    public var createdAt: Date
    public var estimatedMinutes: Int
    public var hmacSignature: String
    
    public init(
        id: String = UUID().uuidString,
        orderNumber: String,
        tableId: Int,
        tableName: String = "Meja 5",
        seatId: String? = nil,
        outletId: String = "OUTLET-01",
        items: [CartItem],
        subtotal: Int,
        tax: Int,
        total: Int,
        paymentMethod: PaymentMethod,
        paymentStatus: String = "PAID",
        orderStatus: OrderStatus = .received,
        createdAt: Date = Date(),
        estimatedMinutes: Int = 5,
        hmacSignature: String = ""
    ) {
        self.id = id
        self.orderNumber = orderNumber
        self.tableId = tableId
        self.tableName = tableName
        self.seatId = seatId
        self.outletId = outletId
        self.items = items
        self.subtotal = subtotal
        self.tax = tax
        self.total = total
        self.paymentMethod = paymentMethod
        self.paymentStatus = paymentStatus
        self.orderStatus = orderStatus
        self.createdAt = createdAt
        self.estimatedMinutes = estimatedMinutes
        self.hmacSignature = hmacSignature
    }
}
