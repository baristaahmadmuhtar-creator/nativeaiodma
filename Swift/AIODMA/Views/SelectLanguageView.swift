import SwiftUI

public struct SelectLanguageView: View {
    @ObservedObject var orderVM: OrderViewModel
    var onLanguageSelected: () -> Void
    
    public init(orderVM: OrderViewModel, onLanguageSelected: @escaping () -> Void) {
        self.orderVM = orderVM
        self.onLanguageSelected = onLanguageSelected
    }
    
    public var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Top Navigation Back Button
            Button(action: {
                #if os(iOS)
                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                #endif
                onLanguageSelected()
            }) {
                Image(systemName: "chevron.right")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(.appPrimaryText)
                    .frame(width: 44, height: 44)
                    .background(Color.appSecondarySystemGroupedBackground)
                    .clipShape(Circle())
                    .shadow(color: Color.black.opacity(0.04), radius: 6, x: 0, y: 2)
            }
            .padding(.top, 24)
            .padding(.bottom, 50)
            
            // Header Titles
            VStack(alignment: .leading, spacing: 12) {
                Text(orderVM.currentLanguage.selectLanguageTitle)
                    .font(.system(size: 28, weight: .black, design: .default))
                    .foregroundColor(.appPrimaryText)
                    .lineSpacing(2)
                
                Text(orderVM.currentLanguage.selectLanguageSubtitle)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundColor(.appPrimaryText)
                    .lineSpacing(4)
            }
            .padding(.bottom, 48)
            
            // Language Selection Cards List
            VStack(spacing: 16) {
                ForEach(AppLanguage.allCases) { lang in
                    Button(action: {
                        #if os(iOS)
                        UIImpactFeedbackGenerator(style: .light).impactOccurred()
                        #endif
                        withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                            orderVM.currentLanguage = lang
                            onLanguageSelected()
                        }
                    }) {
                        HStack(spacing: 16) {
                            // Flag Icon
                            flagView(for: lang)
                                .frame(width: 28, height: 20)
                                .clipShape(RoundedRectangle(cornerRadius: 3))
                                .shadow(color: Color.black.opacity(0.12), radius: 2, x: 0, y: 1)
                            
                            Text(lang.displayName)
                                .font(.system(size: 16, weight: .heavy))
                                .foregroundColor(.appPrimaryText)
                            
                            Spacer()
                            
                            Image(systemName: "arrow.right")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundColor(Color.appTertiaryLabel)
                        }
                        .padding(.horizontal, 24)
                        .frame(height: 64)
                        .background(Color.appSecondarySystemGroupedBackground)
                        .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
                        .shadow(color: Color.black.opacity(0.04), radius: 10, x: 0, y: 4)
                    }
                    .buttonStyle(PlainButtonStyle())
                }
            }
            
            Spacer()
        }
        .padding(.horizontal, 28)
        .background(Color.appSystemGroupedBackground.ignoresSafeArea())
    }
    
    @ViewBuilder
    private func flagView(for lang: AppLanguage) -> some View {
        switch lang {
        case .brunei:
            ZStack {
                Color(hex: "F7E017")
                Path { path in
                    path.move(to: CGPoint(x: 0, y: 0))
                    path.addLine(to: CGPoint(x: 28, y: 14))
                    path.addLine(to: CGPoint(x: 28, y: 20))
                    path.addLine(to: CGPoint(x: 0, y: 6))
                }
                .fill(Color.white)
                Path { path in
                    path.move(to: CGPoint(x: 0, y: 6))
                    path.addLine(to: CGPoint(x: 28, y: 20))
                    path.addLine(to: CGPoint(x: 28, y: 20))
                    path.addLine(to: CGPoint(x: 0, y: 10))
                }
                .fill(Color.black)
                Circle().fill(Color.red).frame(width: 7, height: 7)
            }
        case .english:
            ZStack {
                Color(hex: "012169")
                Rectangle().fill(Color.white).frame(width: 4)
                Rectangle().fill(Color.white).frame(height: 4)
                Rectangle().fill(Color(hex: "C8102E")).frame(width: 2.5)
                Rectangle().fill(Color(hex: "C8102E")).frame(height: 2.5)
            }
        case .indonesia:
            VStack(spacing: 0) {
                Color(hex: "E11D48")
                Color.white
            }
            .overlay(RoundedRectangle(cornerRadius: 3).stroke(Color.black.opacity(0.08), lineWidth: 0.5))
        }
    }
}
