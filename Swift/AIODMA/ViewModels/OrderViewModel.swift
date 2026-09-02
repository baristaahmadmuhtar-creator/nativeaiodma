import Foundation
import SwiftUI

@MainActor
public final class OrderViewModel: ObservableObject {
    @Published public var currentLanguage: AppLanguage = .indonesia
    @Published public var currentMode: String = "chat" // "chat" or "menu"
    @Published public var activeCategory: MenuCategory = .all
    @Published public var searchQuery: String = ""
    @Published public var tableSession: TableSession?
    @Published public var favorites: Set<String> = ["kopi_milk_aren", "iced_latte"]
    
    // Clean initial cart (No dummy items)
    @Published public var cart: [CartItem] = []
    
    // Live Order Tracking State
    @Published public var activeOrder: OrderServerDTO?
    @Published public var activeOrderNumber: String = "#5K9DU"
    @Published public var activeOrderStatus: OrderStatus = .received
    @Published public var orderTrackingActive: Bool = false
    
    @Published public var catalog: [MenuItem] = [
        MenuItem(id: "kopi_milk_aren", name: "Kopi Milk Aren (Es)", category: .coffee, price: 28000, desc: "Espresso, susu segar, gula aren premium", image: "kopi_milk_aren", badge: "Best Seller"),
        MenuItem(id: "iced_latte", name: "Iced Latte", category: .coffee, price: 26000, desc: "Espresso dengan susu segar dan es batu", image: "iced_latte", badge: "Best Seller"),
        MenuItem(id: "hot_latte", name: "Hot Latte", category: .coffee, price: 25000, desc: "Espresso dengan susu hangat", image: "hot_latte", badge: "New"),
        MenuItem(id: "mocha", name: "Mocha", category: .coffee, price: 27000, desc: "Cokelat premium dengan espresso", image: "mocha", badge: "Popular"),
        MenuItem(id: "caramel_latte", name: "Caramel Latte", category: .coffee, price: 27000, desc: "Espresso dengan sirup karamel", image: "caramel_latte"),
        MenuItem(id: "vanilla_latte", name: "Vanilla Latte", category: .coffee, price: 27000, desc: "Espresso dengan sirup vanilla", image: "vanilla_latte"),
        MenuItem(id: "extra_shot", name: "Extra Shot", category: .coffee, price: 3000, desc: "Tambah Espresso untuk rasa lebih Strong", image: "extra_shot", badge: "Paling populer"),
        MenuItem(id: "matilda_cake", name: "Matilda Cake", category: .pastry, price: 18000, desc: "Pas banget teman ngopi kamu", image: "matilda_cake", badge: "Cocok dipadukan"),
        MenuItem(id: "boba", name: "Boba", category: .snacks, price: 5000, desc: "Kenyal manis, bikin nagih!", image: "boba", badge: "Manis & lembut"),
        MenuItem(id: "chicken_rice_bowl", name: "Chicken Rice Bowl", category: .food, price: 32000, desc: "Nasi hangat dengan ayam crispy, sambal spesial dan lalapan segar", image: "chicken_rice_bowl"),
        MenuItem(id: "creamy_carbonara", name: "Creamy Carbonara", category: .food, price: 38000, desc: "Pasta creamy dengan smoke beef dan taburan parmesan.", image: "creamy_carbonara"),
        MenuItem(id: "nasi_goreng", name: "Nasi Goreng Spesial", category: .food, price: 30000, desc: "Nasi goreng dengan bumbu spesial, telur, ayam, dan kerupuk.", image: "nasi_goreng"),
        MenuItem(id: "beef_burger", name: "Beef Burger", category: .food, price: 35000, desc: "Burger daging sapi dengan keju, sayuran segar dan saus spesial", image: "beef_burger"),
        MenuItem(id: "peach_tea", name: "Peach Tea", category: .nonCoffee, price: 24000, desc: "Teh persik segar dengan potongan buah asli dan daun mint.", image: "peach_tea", badge: "Menyegarkan")
    ]
    
    public init() {
        self.tableSession = TableSession(outletId: "OUTLET-01", tableId: 5, tableName: "Meja 5", timestamp: Date().timeIntervalSince1970, nonce: "NONCE-888")
        Task {
            await syncMenuFromServer()
            await syncActiveOrdersFromServer()
        }
    }
    
    public func syncMenuFromServer() async {
        do {
            let serverItems = try await NetworkService.shared.fetchMenu()
            if !serverItems.isEmpty {
                self.catalog = serverItems
            }
        } catch {
            print("[OrderVM] Using cached catalog (offline): \(error)")
        }
    }
    
    public func syncActiveOrdersFromServer() async {
        do {
            let orders = try await NetworkService.shared.fetchActiveOrders(tableNum: tableSession?.tableId ?? 5)
            if let topOrder = orders.first {
                self.activeOrder = topOrder
                self.activeOrderNumber = topOrder.orderNumber
                self.orderTrackingActive = true
                
                switch topOrder.status.lowercased() {
                case "preparing": self.activeOrderStatus = .preparing
                case "ready": self.activeOrderStatus = .ready
                case "completed": self.activeOrderStatus = .completed; self.orderTrackingActive = false
                default: self.activeOrderStatus = .received
                }
            } else {
                self.activeOrder = nil
                self.orderTrackingActive = false
            }
        } catch {
            print("[OrderVM] Active orders sync fallback: \(error)")
        }
    }
    
    public func checkoutOrder(paymentMethod: String = "BIBD") async -> Bool {
        guard !cart.isEmpty else { return false }
        do {
            let created = try await NetworkService.shared.submitOrder(
                table: tableSession?.tableName ?? "Meja 5",
                tableNum: tableSession?.tableId ?? 5,
                items: cart,
                paymentMethod: paymentMethod
            )
            self.activeOrder = created
            self.activeOrderNumber = created.orderNumber
            self.activeOrderStatus = .received
            self.orderTrackingActive = true
            self.cart.removeAll()
            return true
        } catch {
            print("[OrderVM] Checkout failed: \(error)")
            // Offline fallback creation
            self.activeOrderNumber = "#\(Int.random(in: 1000...9999))"
            self.activeOrderStatus = .received
            self.orderTrackingActive = true
            self.cart.removeAll()
            return true
        }
    }
    
    public var filteredCatalog: [MenuItem] {
        catalog.filter { item in
            let matchCat = (activeCategory == .all || item.category == activeCategory)
            let matchSearch = searchQuery.isEmpty || item.name.localizedCaseInsensitiveContains(searchQuery) || item.desc.localizedCaseInsensitiveContains(searchQuery)
            return matchCat && matchSearch
        }
    }
    
    public var subtotal: Int {
        cart.reduce(0) { $0 + $1.totalPrice }
    }
    
    public var tax: Int {
        Int(Double(subtotal) * 0.1)
    }
    
    public var total: Int {
        subtotal + tax
    }
    
    public var totalItemsCount: Int {
        cart.reduce(0) { $0 + $1.quantity }
    }
    
    public func toggleFavorite(id: String) {
        if favorites.contains(id) {
            favorites.remove(id)
        } else {
            favorites.insert(id)
        }
    }
    
    public func addToCart(item: MenuItem, modifier: ModifierOption? = nil) {
        #if os(iOS)
        let generator = UIImpactFeedbackGenerator(style: .medium)
        generator.impactOccurred()
        #endif
        
        if let index = cart.firstIndex(where: { $0.menuItemId == item.id }) {
            cart[index].quantity += 1
        } else {
            let newItem = CartItem(
                menuItemId: item.id,
                name: item.name,
                price: item.price,
                quantity: 1,
                image: item.image,
                subtext: modifier != nil ? "1x \(modifier!.name)" : (item.category == .coffee ? "Es" : "Standar"),
                selectedModifiers: modifier != nil ? [modifier!] : []
            )
            cart.append(newItem)
        }
    }
    
    public func updateQuantity(id: String, delta: Int) {
        #if os(iOS)
        let generator = UIImpactFeedbackGenerator(style: .light)
        generator.impactOccurred()
        #endif
        
        guard let index = cart.firstIndex(where: { $0.id == id }) else { return }
        cart[index].quantity += delta
        if cart[index].quantity <= 0 {
            cart.remove(at: index)
        }
    }
    
    public func clearCart() {
        cart.removeAll()
    }
}
