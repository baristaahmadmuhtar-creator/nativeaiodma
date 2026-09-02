import SwiftUI

// MARK: - Cross-Platform Design System Color Tokens
extension Color {
    public static let appSystemGroupedBackground = Color(hex: "F4F5F8")
    public static let appSecondarySystemGroupedBackground = Color(hex: "FFFFFF")
    public static let appTertiarySystemGroupedBackground = Color(hex: "E8EAEF")
    
    public static let appPrimaryText = Color(hex: "111111")
    public static let appPrimaryAccent = Color(hex: "111111")
    public static let appSecondaryLabel = Color(hex: "6B7280")
    public static let appTertiaryLabel = Color(hex: "9CA3AF")
    public static let appSeparator = Color(hex: "E5E7EB")
    
    public static let appEmerald = Color(hex: "10B981")
    public static let appWarmBeige = Color(hex: "F8EFE3")
    public static let appWarmBrown = Color(hex: "965B20")
    public static let appAmber = Color(hex: "D97706")
    
    public init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (1, 1, 1, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue:  Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - Integer Currency Formatter Extension
extension Int {
    public var formattedWithSeparator: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.groupingSeparator = "."
        return formatter.string(from: NSNumber(value: self)) ?? "\(self)"
    }
}
