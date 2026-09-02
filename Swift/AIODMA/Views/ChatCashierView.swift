import SwiftUI

public struct ChatCashierView: View {
    @ObservedObject var orderVM: OrderViewModel
    @StateObject private var aiVM = AICashierViewModel()
    @Binding var showCartSheet: Bool
    
    public init(orderVM: OrderViewModel, showCartSheet: Binding<Bool>) {
        self.orderVM = orderVM
        self._showCartSheet = showCartSheet
    }
    
    public var body: some View {
        ZStack(alignment: .bottom) {
            ScrollViewReader { scrollProxy in
                ScrollView {
                    VStack(spacing: 16) {
                        if aiVM.messages.isEmpty {
                            // MARK: - Empty State (Home 5.JPG)
                            emptyStateView
                        } else {
                            // MARK: - Conversation Thread
                            ForEach(aiVM.messages) { msg in
                                if msg.isUser {
                                    userMessageBubble(msg.text)
                                } else {
                                    aiMessageBubble(msg)
                                }
                            }
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.top, 16)
                    .padding(.bottom, 120)
                }
                .onChange(of: aiVM.messages.count) { _ in
                    if let last = aiVM.messages.last {
                        withAnimation {
                            scrollProxy.scrollTo(last.id, anchor: .bottom)
                        }
                    }
                }
            }
            
            // MARK: - Floating Bottom Input Bar (Home 3-7.JPG)
            floatingBottomBar
        }
        .background(Color.appSystemGroupedBackground)
    }
    
    // MARK: - Empty State View
    private var emptyStateView: some View {
        VStack(alignment: .leading, spacing: 24) {
            Text(orderVM.currentLanguage.chatEmptyTitle)
                .font(.system(size: 30, weight: .black, design: .default))
                .foregroundColor(.appPrimaryText)
                .lineSpacing(2)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.top, 24)
            
            VStack(spacing: 12) {
                // Prompt 1
                quickPromptCard(
                    icon: "sparkles",
                    text: "Rekomendasi untuk saya",
                    query: "Ada rekomendasi kopi yang manis?"
                )
                
                // Prompt 2
                quickPromptCard(
                    icon: "cup.and.saucer",
                    text: "Butuh yang menyegarkan",
                    query: "Saya butuh minuman yang segar dan dingin"
                )
                
                // Prompt 3
                quickPromptCard(
                    icon: "list.clipboard",
                    text: "Lihat semua menu",
                    query: "Ada Makanan apa saja?"
                )
            }
            .frame(maxWidth: .infinity, alignment: .trailing)
            .padding(.leading, 60)
        }
    }
    
    private func quickPromptCard(icon: String, text: String, query: String) -> some View {
        Button(action: {
            #if os(iOS)
            UIImpactFeedbackGenerator(style: .light).impactOccurred()
            #endif
            aiVM.sendQuery(query, orderVM: orderVM)
        }) {
            HStack(spacing: 12) {
                Image(systemName: icon)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundColor(.appPrimaryText)
                    .frame(width: 32, height: 32)
                    .background(Color.appTertiarySystemGroupedBackground)
                    .clipShape(Circle())
                
                Text(text)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.appPrimaryText)
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundColor(Color.appTertiaryLabel)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 12)
            .background(Color.appSecondarySystemGroupedBackground)
            .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
            .shadow(color: Color.black.opacity(0.04), radius: 8, x: 0, y: 2)
        }
        .buttonStyle(PlainButtonStyle())
    }
    
    // MARK: - User Bubble
    private func userMessageBubble(_ text: String) -> some View {
        HStack {
            Spacer()
            Text(text)
                .font(.system(size: 15, weight: .medium))
                .foregroundColor(.appPrimaryText)
                .padding(.horizontal, 18)
                .padding(.vertical, 14)
                .background(Color.appTertiarySystemGroupedBackground)
                .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        }
    }
    
    // MARK: - AI Message Bubble & Interactive Cards
    private func aiMessageBubble(_ msg: AIChatMessage) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            // Text Bubble
            HStack {
                Text(msg.text)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundColor(.appPrimaryText)
                    .padding(.horizontal, 18)
                    .padding(.vertical, 14)
                    .background(Color.appSecondarySystemGroupedBackground)
                    .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
                    .shadow(color: Color.black.opacity(0.04), radius: 8, x: 0, y: 2)
                Spacer()
            }
            
            // Added Confirmation Card (Home 7.JPG)
            if let added = msg.addedItem {
                HStack(spacing: 12) {
                    Image(added.image)
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(width: 48, height: 48)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text("Ditambahkan ke keranjang")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(Color.appSecondaryLabel)
                        Text(added.name)
                            .font(.system(size: 13, weight: .bold))
                            .foregroundColor(.appPrimaryText)
                        Text(added.formattedPrice)
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(Color.appSecondaryLabel)
                    }
                    
                    Spacer()
                    
                    Image(systemName: "checkmark.circle.fill")
                        .font(.system(size: 20, weight: .bold))
                        .foregroundColor(.appPrimaryText)
                }
                .padding(14)
                .background(Color.appSecondarySystemGroupedBackground)
                .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                .shadow(color: Color.black.opacity(0.04), radius: 10, x: 0, y: 2)
            }
            
            // Recommendations Carousel (Home 6-7, 10.JPG)
            if let recs = msg.recommendations, !recs.isEmpty {
                VStack(alignment: .leading, spacing: 10) {
                    if msg.showFoodCategory {
                        HStack(spacing: 8) {
                            Image(systemName: "fork.knife")
                                .font(.system(size: 13, weight: .bold))
                                .frame(width: 28, height: 28)
                                .background(Color.appSystemGroupedBackground)
                                .clipShape(Circle())
                            Text("MAKANAN")
                                .font(.system(size: 14, weight: .heavy))
                                .foregroundColor(.appPrimaryText)
                        }
                    }
                    
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 12) {
                            ForEach(recs) { item in
                                recommendationMiniCard(item)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }
                .padding(16)
                .background(Color.appSecondarySystemGroupedBackground)
                .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
                .shadow(color: Color.black.opacity(0.04), radius: 12, x: 0, y: 4)
            }
            
            // Quick Replies (Home 7.JPG)
            if let replies = msg.quickReplies, !replies.isEmpty {
                HStack(spacing: 8) {
                    ForEach(replies, id: \.self) { reply in
                        Button(action: {
                            #if os(iOS)
                            UIImpactFeedbackGenerator(style: .light).impactOccurred()
                            #endif
                            if reply == "Lihat keranjang" {
                                showCartSheet = true
                            } else if reply == "Lanjut pilih menu lain" {
                                orderVM.currentMode = "menu"
                            } else {
                                aiVM.sendQuery(reply, orderVM: orderVM)
                            }
                        }) {
                            Text(reply)
                                .font(.system(size: 13, weight: .bold))
                                .foregroundColor(.appPrimaryText)
                                .padding(.horizontal, 16)
                                .padding(.vertical, 8)
                                .background(Color.appSecondarySystemGroupedBackground)
                                .clipShape(Capsule())
                                .overlay(Capsule().stroke(Color.black.opacity(0.08), lineWidth: 1))
                        }
                    }
                }
            }
        }
    }
    
    private func recommendationMiniCard(_ item: MenuItem) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            ZStack(alignment: .topLeading) {
                Image(item.image)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: 160, height: 120)
                    .clipped()
                
                if let badge = item.badge {
                    Text(badge)
                        .font(.system(size: 10, weight: .heavy))
                        .foregroundColor(Color.appWarmBrown)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 4)
                        .background(Color.appWarmBeige)
                        .clipShape(Capsule())
                        .padding(8)
                }
                
                // Add button
                Button(action: {
                    orderVM.addToCart(item: item)
                    aiVM.sendQuery("Aku mau \(item.name)", orderVM: orderVM)
                }) {
                    Image(systemName: "plus")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(.appPrimaryText)
                        .frame(width: 32, height: 32)
                        .background(Color.white.opacity(0.95))
                        .clipShape(Circle())
                        .shadow(color: Color.black.opacity(0.12), radius: 4, x: 0, y: 2)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
                .padding(8)
            }
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            
            VStack(alignment: .leading, spacing: 2) {
                Text(item.name)
                    .font(.system(size: 13, weight: .bold))
                    .foregroundColor(.appPrimaryText)
                    .lineLimit(1)
                
                Text(item.desc)
                    .font(.system(size: 10, weight: .medium))
                    .foregroundColor(Color.appSecondaryLabel)
                    .lineLimit(2)
                
                Text(item.formattedPrice)
                    .font(.system(size: 12, weight: .heavy))
                    .foregroundColor(.appPrimaryText)
                    .padding(.top, 2)
            }
            .padding(.horizontal, 8)
            .padding(.bottom, 8)
        }
        .frame(width: 160)
        .background(Color.appSecondarySystemGroupedBackground)
        .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
        .shadow(color: Color.black.opacity(0.03), radius: 6, x: 0, y: 2)
    }
    
    // MARK: - Floating Bottom Bar
    private var floatingBottomBar: some View {
        HStack(spacing: 12) {
            Button(action: {
                #if os(iOS)
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                #endif
            }) {
                Image(systemName: "doc.badge.plus")
                    .font(.system(size: 20, weight: .medium))
                    .foregroundColor(.appPrimaryText)
                    .frame(width: 36, height: 36)
            }
            
            TextField("Silahkan order", text: $aiVM.inputText)
                .font(.system(size: 15, weight: .medium))
                .submitLabel(.send)
                .onSubmit {
                    aiVM.sendQuery(aiVM.inputText, orderVM: orderVM)
                }
            
            if !aiVM.inputText.trimmingCharacters(in: .whitespaces).isEmpty {
                Button(action: {
                    aiVM.sendQuery(aiVM.inputText, orderVM: orderVM)
                }) {
                    Image(systemName: "paperplane.fill")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundColor(.appPrimaryText)
                        .frame(width: 36, height: 36)
                }
            } else {
                Button(action: {
                    #if os(iOS)
                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                    #endif
                    showCartSheet = true
                }) {
                    ZStack(alignment: .topTrailing) {
                        Image(systemName: "cart")
                            .font(.system(size: 20, weight: .medium))
                            .foregroundColor(.appPrimaryText)
                            .frame(width: 36, height: 36)
                        
                        if orderVM.totalItemsCount > 0 {
                            Text("\(orderVM.totalItemsCount)")
                                .font(.system(size: 10, weight: .heavy))
                                .foregroundColor(.white)
                                .padding(4)
                                .background(Color.appPrimaryText)
                                .clipShape(Circle())
                                .offset(x: 2, y: -2)
                        }
                    }
                }
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(
            Color.white.opacity(0.9)
                .background(.ultraThinMaterial)
                .clipShape(Capsule())
                .shadow(color: Color.black.opacity(0.08), radius: 20, x: 0, y: 8)
        )
        .padding(.horizontal, 16)
        .padding(.bottom, 24)
    }
}
