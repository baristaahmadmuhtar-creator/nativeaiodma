import Foundation

// MARK: - Server Response Models
public struct ServerMenuResponse: Codable {
    public let success: Bool
    public let data: [MenuItemServerDTO]?
    public let error: String?
}

public struct MenuItemServerDTO: Codable {
    public let id: String
    public let name: String
    public let category: String
    public let price: Double
    public let desc: String
    public let available: Bool?
    public let pairings: [String]?
    public let flavorProfile: String?
    public let upsellHook: String?
}

public struct ServerOrdersResponse: Codable {
    public let success: Bool
    public let merchantId: String?
    public let currency: String?
    public let currencySymbol: String?
    public let data: [OrderServerDTO]?
    public let error: String?
}

public struct OrderServerDTO: Codable {
    public let id: String?
    public let orderNumber: String
    public let table: String?
    public let tableNum: Int?
    public let items: [OrderItemServerDTO]
    public let subtotal: Double?
    public let tax: Double?
    public let total: Double
    public let status: String
    public let paymentStatus: String?
    public let paymentMethod: String?
    public let createdAt: String?
}

public struct OrderItemServerDTO: Codable {
    public let id: String?
    public let name: String
    public let price: Double?
    public let qty: Int
    public let subtext: String?
}

public struct AIChatResponseDTO: Codable {
    public let success: Bool
    public let text: String?
    public let error: String?
    public let suggestions: [String]?
}

// MARK: - Network Service Singleton
public final class NetworkService {
    public static let shared = NetworkService()
    
    public var baseURL: URL = URL(string: "http://127.0.0.1:8080")!
    
    private init() {}
    
    // MARK: - Fetch Menu Catalog
    public func fetchMenu(merchantId: String = "coffeenity") async throws -> [MenuItem] {
        var components = URLComponents(url: baseURL.appendingPathComponent("/api/menu"), resolvingAgainstBaseURL: false)!
        components.queryItems = [URLQueryItem(name: "merchant", value: merchantId)]
        
        var request = URLRequest(url: components.url!)
        request.setValue(merchantId, forHTTPHeaderField: "x-merchant-id")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpRes = response as? HTTPURLResponse, httpRes.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
        
        // Handle both raw array and wrapped { success: true, data: [...] }
        if let list = try? JSONDecoder().decode([MenuItemServerDTO].self, from: data) {
            return mapMenuItems(list)
        }
        
        let decoded = try JSONDecoder().decode(ServerMenuResponse.self, from: data)
        guard decoded.success, let list = decoded.data else {
            return []
        }
        
        return mapMenuItems(list)
    }
    
    private func mapMenuItems(_ list: [MenuItemServerDTO]) -> [MenuItem] {
        return list.map { dto in
            let cat: MenuCategory
            switch dto.category.lowercased() {
            case "kopi", "coffee": cat = .coffee
            case "non-kopi", "noncoffee": cat = .nonCoffee
            case "makanan", "food", "indomee": cat = .food
            case "pastry", "cake": cat = .pastry
            case "cemilan", "snacks", "pizza": cat = .snacks
            default: cat = .all
            }
            return MenuItem(
                id: dto.id,
                name: dto.name,
                category: cat,
                price: Int(dto.price),
                desc: dto.desc,
                image: dto.id,
                isAvailable: dto.available ?? true
            )
        }
    }
    
    // MARK: - Fetch Active Orders for Table
    public func fetchActiveOrders(tableNum: Int = 5, merchantId: String = "coffeenity") async throws -> [OrderServerDTO] {
        let url = baseURL.appendingPathComponent("/api/orders/table/\(tableNum)")
        var request = URLRequest(url: url)
        request.setValue(merchantId, forHTTPHeaderField: "x-merchant-id")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let httpRes = response as? HTTPURLResponse, httpRes.statusCode == 200 else {
            throw URLError(.badServerResponse)
        }
        
        let decoded = try JSONDecoder().decode(ServerOrdersResponse.self, from: data)
        guard decoded.success, let orders = decoded.data else {
            return []
        }
        
        return orders.filter { $0.status != "completed" && $0.status != "cancelled" }
    }
    
    // MARK: - Submit New Order
    public func submitOrder(table: String = "Meja 5", tableNum: Int = 5, items: [CartItem], paymentMethod: String = "BIBD", merchantId: String = "coffeenity") async throws -> OrderServerDTO {
        let url = baseURL.appendingPathComponent("/api/orders")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(merchantId, forHTTPHeaderField: "x-merchant-id")
        
        let payload: [String: Any] = [
            "table": table,
            "tableNum": tableNum,
            "merchantId": merchantId,
            "items": items.map { [
                "id": $0.menuItemId,
                "name": $0.name,
                "price": $0.price,
                "qty": $0.quantity,
                "subtext": $0.subtext ?? ""
            ] },
            "paymentMethod": paymentMethod,
            "idempotencyKey": "SWIFT_NATIVE_\(Date().timeIntervalSince1970)"
        ]
        
        request.httpBody = try JSONSerialization.data(withJSONObject: payload)
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpRes = response as? HTTPURLResponse, (200...299).contains(httpRes.statusCode) else {
            throw URLError(.badServerResponse)
        }
        
        struct CreateOrderResp: Codable {
            let success: Bool
            let order: OrderServerDTO
        }
        
        let decoded = try JSONDecoder().decode(CreateOrderResp.self, from: data)
        return decoded.order
    }
    
    // MARK: - Send AI Chat Message
    public func sendChatMessage(message: String, history: [[String: String]] = [], table: String = "Meja 5", cart: [CartItem] = [], merchantId: String = "coffeenity") async throws -> AIChatResponseDTO {
        let url = baseURL.appendingPathComponent("/api/ai/chat")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(merchantId, forHTTPHeaderField: "x-merchant-id")
        
        let payload: [String: Any] = [
            "message": message,
            "merchant": merchantId,
            "history": history,
            "table": table,
            "cart": cart.map { [
                "id": $0.menuItemId,
                "name": $0.name,
                "qty": $0.quantity,
                "price": $0.price,
                "subtext": $0.subtext ?? ""
            ] }
        ]
        
        request.httpBody = try JSONSerialization.data(withJSONObject: payload)
        let (data, response) = try await URLSession.shared.data(for: request)
        
        guard let httpRes = response as? HTTPURLResponse, (200...299).contains(httpRes.statusCode) else {
            throw URLError(.badServerResponse)
        }
        
        return try JSONDecoder().decode(AIChatResponseDTO.self, from: data)
    }
}
