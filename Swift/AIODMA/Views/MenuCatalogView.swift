import SwiftUI

public struct MenuCatalogView: View {
    @ObservedObject var orderVM: OrderViewModel
    @Binding var showCartSheet: Bool
    
    private let columns = [
        GridItem(.flexible(), spacing: 14),
        GridItem(.flexible(), spacing: 14)
    ]
    
    public init(orderVM: OrderViewModel, showCartSheet: Binding<Bool>) {
        self.orderVM = orderVM
        self._showCartSheet = showCartSheet
    }
    
    public var body: some View {
        ZStack(alignment: .bottom) {
            ScrollView {
                VStack(spacing: 16) {
                    // MARK: - Category Filter Scroll Tabs
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(MenuCategory.allCases) { cat in
                                Button(action: {
                                    #if os(iOS)
                                    UIImpactFeedbackGenerator(style: .light).impactOccurred()
                                    #endif
                                    withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                                        orderVM.activeCategory = cat
                                    }
                                }) {
                                    Text(cat.rawValue)
                                        .font(.system(size: 13, weight: .bold))
                                        .foregroundColor(orderVM.activeCategory == cat ? .white : Color.appSecondaryLabel)
                                        .padding(.horizontal, 18)
                                        .padding(.vertical, 10)
                                        .background(orderVM.activeCategory == cat ? Color.appPrimaryText : Color.appSecondarySystemGroupedBackground)
                                        .clipShape(Capsule())
                                        .shadow(color: Color.black.opacity(orderVM.activeCategory == cat ? 0.15 : 0.03), radius: 6, x: 0, y: 2)
                                }
                            }
                        }
                        .padding(.horizontal, 16)
                    }
                    .padding(.top, 8)
                    
                    // MARK: - 2-Column Product Grid (Home 2.JPG)
                    LazyVGrid(columns: columns, spacing: 14) {
                        ForEach(orderVM.filteredCatalog) { item in
                            productCardView(item)
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 120)
                }
            }
            
            // MARK: - Bottom Floating Bar (Search + Cart Pill)
            catalogFloatingBottomBar
        }
        .background(Color.appSystemGroupedBackground)
    }
    
    private func productCardView(_ item: MenuItem) -> some View {
        let isFav = orderVM.favorites.contains(item.id)
        
        return VStack(alignment: .leading, spacing: 6) {
            // Image + Badge + Heart
            ZStack(alignment: .topLeading) {
                Image(item.image)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(height: 140)
                    .clipped()
                
                if let badge = item.badge {
                    Text(badge)
                        .font(.system(size: 11, weight: .heavy))
                        .foregroundColor(Color.appWarmBrown)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(Color.appWarmBeige)
                        .clipShape(Capsule())
                        .padding(10)
                }
                
                Button(action: {
                    orderVM.toggleFavorite(id: item.id)
                }) {
                    Image(systemName: isFav ? "heart.fill" : "heart")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(isFav ? Color(hex: "EF4444") : Color.appPrimaryText)
                        .frame(width: 32, height: 32)
                        .background(Color.white.opacity(0.9))
                        .clipShape(Circle())
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
                .padding(10)
            }
            .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
            
            // Body info
            VStack(alignment: .leading, spacing: 4) {
                Text(item.name)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(Color.appPrimaryText)
                    .lineLimit(1)
                
                Text(item.desc)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundColor(Color.appSecondaryLabel)
                    .lineLimit(2)
                    .frame(height: 32, alignment: .topLeading)
                
                HStack {
                    Text(item.formattedPrice)
                        .font(.system(size: 14, weight: .heavy))
                        .foregroundColor(Color.appPrimaryText)
                    
                    Spacer()
                    
                    Button(action: {
                        orderVM.addToCart(item: item)
                    }) {
                        Image(systemName: "plus")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(Color.appPrimaryText)
                            .frame(width: 34, height: 34)
                            .background(Color.appSystemGroupedBackground)
                            .clipShape(Circle())
                    }
                }
                .padding(.top, 4)
            }
            .padding(12)
        }
        .background(Color.appSecondarySystemGroupedBackground)
        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
        .shadow(color: Color.black.opacity(0.04), radius: 10, x: 0, y: 3)
    }
    
    private var catalogFloatingBottomBar: some View {
        HStack(spacing: 12) {
            HStack(spacing: 10) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 18, weight: .medium))
                    .foregroundColor(Color.appTertiaryLabel)
                
                TextField("Silahkan cari", text: $orderVM.searchQuery)
                    .font(.system(size: 15, weight: .medium))
            }
            
            Rectangle()
                .fill(Color.appSeparator)
                .frame(width: 1, height: 28)
                .padding(.horizontal, 4)
            
            Button(action: {
                #if os(iOS)
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                #endif
                showCartSheet = true
            }) {
                HStack(spacing: 8) {
                    Text("\(orderVM.totalItemsCount)")
                        .font(.system(size: 11, weight: .heavy))
                        .foregroundColor(.black)
                        .frame(width: 20, height: 20)
                        .background(Color.white)
                        .clipShape(Circle())
                    
                    Image(systemName: "cart.fill")
                        .font(.system(size: 13, weight: .bold))
                    
                    Text("Rp \(orderVM.subtotal)")
                        .font(.system(size: 13, weight: .heavy))
                    
                    Image(systemName: "chevron.right")
                        .font(.system(size: 10, weight: .heavy))
                }
                .foregroundColor(.white)
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
                .background(Color.appPrimaryText)
                .clipShape(Capsule())
                .shadow(color: Color.black.opacity(0.18), radius: 8, x: 0, y: 3)
            }
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .background(
            Color.white.opacity(0.92)
                .background(.ultraThinMaterial)
                .clipShape(Capsule())
                .shadow(color: Color.black.opacity(0.08), radius: 20, x: 0, y: 8)
        )
        .padding(.horizontal, 16)
        .padding(.bottom, 24)
    }
}
