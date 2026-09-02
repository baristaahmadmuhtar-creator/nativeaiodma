import Foundation

// MARK: - Category Enum
public enum MenuCategory: String, Codable, CaseIterable, Identifiable {
    case all = "Semua"
    case coffee = "Kopi"
    case nonCoffee = "Non-Kopi"
    case pastry = "Pastry"
    case food = "Makanan"
    case snacks = "Cemilan"
    
    public var id: String { rawValue }
    
    public var rawKey: String {
        switch self {
        case .all: return "all"
        case .coffee: return "kopi"
        case .nonCoffee: return "non-kopi"
        case .pastry: return "pastry"
        case .food: return "makanan"
        case .snacks: return "cemilan"
        }
    }
}

#if canImport(SwiftData)
import SwiftData

// MARK: - MenuItem Entity (SwiftData)
@Model
public final class MenuItemEntity {
    @Attribute(.unique) public var id: String
    public var name: String
    public var categoryRaw: String
    public var price: Int
    public var itemDescription: String
    public var imageUrl: String
    public var badge: String?
    public var isAvailable: Bool
    public var tags: [String]
    
    public init(
        id: String,
        name: String,
        categoryRaw: String,
        price: Int,
        itemDescription: String,
        imageUrl: String,
        badge: String? = nil,
        isAvailable: Bool = true,
        tags: [String] = []
    ) {
        self.id = id
        self.name = name
        self.categoryRaw = categoryRaw
        self.price = price
        self.itemDescription = itemDescription
        self.imageUrl = imageUrl
        self.badge = badge
        self.isAvailable = isAvailable
        self.tags = tags
    }
}
#endif

// MARK: - MenuItem Codable Struct
public struct MenuItem: Identifiable, Codable, Hashable {
    public var id: String
    public var name: String
    public var category: MenuCategory
    public var price: Int
    public var desc: String
    public var image: String
    public var badge: String?
    public var isAvailable: Bool
    public var modifiers: [ModifierOption]?
    
    public init(
        id: String,
        name: String,
        category: MenuCategory,
        price: Int,
        desc: String,
        image: String,
        badge: String? = nil,
        isAvailable: Bool = true,
        modifiers: [ModifierOption]? = nil
    ) {
        self.id = id
        self.name = name
        self.category = category
        self.price = price
        self.desc = desc
        self.image = image
        self.badge = badge
        self.isAvailable = isAvailable
        self.modifiers = modifiers
    }
    
    public var formattedPrice: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencySymbol = "Rp "
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: price)) ?? "Rp \(price)"
    }
}

// MARK: - Modifier Option
public struct ModifierOption: Identifiable, Codable, Hashable {
    public var id: String = UUID().uuidString
    public var name: String
    public var priceDelta: Int
    
    public init(name: String, priceDelta: Int) {
        self.name = name
        self.priceDelta = priceDelta
    }
}

// MARK: - Cart Item
public struct CartItem: Identifiable, Codable, Hashable {
    public var id: String = UUID().uuidString
    public var menuItemId: String
    public var name: String
    public var price: Int
    public var quantity: Int
    public var image: String
    public var subtext: String?
    public var seatId: String?
    public var selectedModifiers: [ModifierOption]
    
    public init(
        id: String = UUID().uuidString,
        menuItemId: String,
        name: String,
        price: Int,
        quantity: Int,
        image: String,
        subtext: String? = nil,
        seatId: String? = nil,
        selectedModifiers: [ModifierOption] = []
    ) {
        self.id = id
        self.menuItemId = menuItemId
        self.name = name
        self.price = price
        self.quantity = quantity
        self.image = image
        self.subtext = subtext
        self.seatId = seatId
        self.selectedModifiers = selectedModifiers
    }
    
    public var totalPrice: Int {
        let modSum = selectedModifiers.reduce(0) { $0 + $1.priceDelta }
        return (price + modSum) * quantity
    }
    
    public var formattedTotalPrice: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencySymbol = "Rp "
        formatter.maximumFractionDigits = 0
        return formatter.string(from: NSNumber(value: totalPrice)) ?? "Rp \(totalPrice)"
    }
}
