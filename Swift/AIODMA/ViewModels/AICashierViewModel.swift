import Foundation
import SwiftUI

public struct AIChatMessage: Identifiable, Equatable {
    public let id: String = UUID().uuidString
    public let isUser: Bool
    public let text: String
    public var addedItem: MenuItem?
    public var recommendations: [MenuItem]?
    public var showFoodCategory: Bool
    public var quickReplies: [String]?
    public let timestamp: Date = Date()
    
    public init(
        isUser: Bool,
        text: String,
        addedItem: MenuItem? = nil,
        recommendations: [MenuItem]? = nil,
        showFoodCategory: Bool = false,
        quickReplies: [String]? = nil
    ) {
        self.isUser = isUser
        self.text = text
        self.addedItem = addedItem
        self.recommendations = recommendations
        self.showFoodCategory = showFoodCategory
        self.quickReplies = quickReplies
    }
}

@MainActor
public final class AICashierViewModel: ObservableObject {
    @Published public var messages: [AIChatMessage] = []
    @Published public var inputText: String = ""
    @Published public var isTyping: Bool = false
    
    public init() {}
    
    public func sendQuery(_ query: String, orderVM: OrderViewModel) {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return }
        
        // 1. Append User Message
        messages.append(AIChatMessage(isUser: true, text: trimmed))
        inputText = ""
        isTyping = true
        
        #if os(iOS)
        UIImpactFeedbackGenerator(style: .medium).impactOccurred()
        #endif
        
        // 2. Call AI Backend API
        Task {
            let historyDTO = messages.map { ["role": $0.isUser ? "user" : "model", "text": $0.text] }
            do {
                let response = try await NetworkService.shared.sendChatMessage(
                    message: trimmed,
                    history: historyDTO,
                    table: orderVM.tableSession?.tableName ?? "Meja 5",
                    cart: orderVM.cart
                )
                
                self.isTyping = false
                let replyText = response.text ?? "Pesanan Anda sedang kami siapkan di bar."
                self.messages.append(AIChatMessage(
                    isUser: false,
                    text: replyText,
                    quickReplies: response.suggestions
                ))
                
                #if os(iOS)
                UINotificationFeedbackGenerator().notificationOccurred(.success)
                #endif
            } catch {
                self.isTyping = false
                // Local intelligent fallback
                let fallback = self.generateLocalFallback(for: trimmed, orderVM: orderVM)
                self.messages.append(fallback)
            }
        }
    }
    
    private func generateLocalFallback(for query: String, orderVM: OrderViewModel) -> AIChatMessage {
        let lower = query.lowercased()
        if lower.contains("rekomendasi") || lower.contains("manis") {
            let item = orderVM.catalog.first(where: { $0.id == "kopi_milk_aren" })
            return AIChatMessage(
                isUser: false,
                text: "Untuk kopi manis favorit, saya sangat merekomendasikan Kopi Milk Aren (Es) dengan gula aren murni!",
                recommendations: item != nil ? [item!] : [],
                quickReplies: ["Tambah ke keranjang", "Lihat menu lain"]
            )
        } else if lower.contains("segar") || lower.contains("dingin") {
            let item = orderVM.catalog.first(where: { $0.id == "peach_tea" })
            return AIChatMessage(
                isUser: false,
                text: "Untuk kesegaran maksimal, Peach Tea dingin dengan potongan buah asli sangat pas menemani waktu Anda!",
                recommendations: item != nil ? [item!] : [],
                quickReplies: ["Pesan Peach Tea", "Lihat rekomendasi lain"]
            )
        } else if lower.contains("makan") || lower.contains("lapar") {
            let foods = orderVM.catalog.filter { $0.category == .food }
            return AIChatMessage(
                isUser: false,
                text: "Kami memiliki pilihan makanan lezat yang siap dihidangkan hangat untuk Anda:",
                recommendations: Array(foods.prefix(3)),
                showFoodCategory: true,
                quickReplies: ["Nasi Goreng Spesial", "Beef Burger"]
            )
        } else if lower.contains("lacak") || lower.contains("pesanan") || lower.contains("status") {
            if orderVM.orderTrackingActive {
                return AIChatMessage(
                    isUser: false,
                    text: "Pesanan Meja 5 (\(orderVM.activeOrderNumber)) saat ini berstatus: \(orderVM.activeOrderStatus.rawValue). Sedang diproses di dapur!",
                    quickReplies: ["Lihat rincian", "Panggil pelayan"]
                )
            } else {
                return AIChatMessage(
                    isUser: false,
                    text: "Belum ada pesanan aktif di dapur untuk Meja 5 saat ini. Silakan pesan menu favorit Anda!",
                    quickReplies: ["Lihat semua menu", "Rekomendasi kopi"]
                )
            }
        } else {
            return AIChatMessage(
                isUser: false,
                text: "Halo! Ada kopi, minuman segar, atau makanan lezat yang ingin saya siapkan untuk Meja 5?",
                quickReplies: ["Rekomendasi untuk saya", "Lihat semua menu"]
            )
        }
    }
}
