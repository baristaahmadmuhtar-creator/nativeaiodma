import SwiftUI

@available(iOS 16.0, macOS 13.0, *)
@main
public struct AIODMAApp: App {
    @StateObject private var orderVM = OrderViewModel()
    @State private var currentFlow: AppFlow = .languageSelection
    @State private var showModeDropdown: Bool = false
    @State private var showOptionsSheet: Bool = false
    @State private var showCartSheet: Bool = false
    @State private var showPaymentSheet: Bool = false
    @State private var showOrderTrackerSheet: Bool = false
    @State private var showSplitBill: Bool = false
    @State private var showTableInfo: Bool = false
    
    enum AppFlow {
        case languageSelection
        case mainApp
        case orderSuccess
        case thermalReceipt
    }
    
    public init() {}
    
    public var body: some Scene {
        WindowGroup {
            ZStack {
                switch currentFlow {
                case .languageSelection:
                    SelectLanguageView(orderVM: orderVM) {
                        withAnimation(.spring(response: 0.35, dampingFraction: 0.8)) {
                            currentFlow = .mainApp
                        }
                    }
                    
                case .mainApp:
                    ZStack(alignment: .top) {
                        VStack(spacing: 0) {
                            HeaderNavBarView(
                                orderVM: orderVM,
                                showModeDropdown: $showModeDropdown,
                                showOptionsSheet: $showOptionsSheet,
                                onBack: {
                                    withAnimation { currentFlow = .languageSelection }
                                },
                                onShowTracker: {
                                    showOrderTrackerSheet = true
                                },
                                onShowTableInfo: {
                                    showTableInfo = true
                                },
                                onChangeLanguage: {
                                    currentFlow = .languageSelection
                                },
                                onCallWaiter: {
                                    #if os(iOS)
                                    UINotificationFeedbackGenerator().notificationOccurred(.success)
                                    #endif
                                }
                            )
                            
                            if orderVM.currentMode == "chat" {
                                ChatCashierView(orderVM: orderVM, showCartSheet: $showCartSheet)
                            } else {
                                MenuCatalogView(orderVM: orderVM, showCartSheet: $showCartSheet)
                            }
                        }
                        
                        // Floating Dynamic Island Overlay (Zero Layout Shift)
                        if orderVM.orderTrackingActive {
                            LiveActivityBannerView(orderVM: orderVM) {
                                showOrderTrackerSheet = true
                            }
                            .padding(.top, 64)
                        }
                    }
                    
                case .orderSuccess:
                    OrderSuccessView(
                        orderNumber: orderVM.activeOrderNumber,
                        onTrackOrder: {
                            showOrderTrackerSheet = true
                        },
                        onSaveReceipt: {
                            withAnimation { currentFlow = .thermalReceipt }
                        },
                        onBackToChat: {
                            orderVM.currentMode = "chat"
                            withAnimation { currentFlow = .mainApp }
                        }
                    )
                    
                case .thermalReceipt:
                    ThermalReceiptView(orderVM: orderVM, orderNumber: orderVM.activeOrderNumber, paymentMethod: "BIBD")
                        .overlay(alignment: .topLeading) {
                            Button(action: {
                                withAnimation { currentFlow = .mainApp }
                            }) {
                                Image(systemName: "xmark")
                                    .font(.system(size: 14, weight: .bold))
                                    .foregroundColor(.black)
                                    .frame(width: 36, height: 36)
                                    .background(Color.white)
                                    .clipShape(Circle())
                                    .shadow(radius: 4)
                            }
                            .padding(.top, 16)
                            .padding(.leading, 16)
                        }
                }
            }
            .sheet(isPresented: $showCartSheet) {
                CartBottomSheetView(orderVM: orderVM) {
                    showCartSheet = false
                    showPaymentSheet = true
                }
            }
            .sheet(isPresented: $showPaymentSheet) {
                PaymentSheetView(orderVM: orderVM) { method in
                    showPaymentSheet = false
                    Task {
                        _ = await orderVM.checkoutOrder(paymentMethod: method.rawValue)
                        withAnimation { currentFlow = .orderSuccess }
                    }
                }
            }
            .sheet(isPresented: $showOrderTrackerSheet) {
                OrderTrackerSheetView(
                    orderVM: orderVM,
                    onClose: { showOrderTrackerSheet = false },
                    onCallWaiter: {
                        #if os(iOS)
                        UINotificationFeedbackGenerator().notificationOccurred(.success)
                        #endif
                    },
                    onOrderMore: {
                        showOrderTrackerSheet = false
                        orderVM.currentMode = "menu"
                    }
                )
            }
            .sheet(isPresented: $showSplitBill) {
                SplitBillView(orderVM: orderVM)
            }
        }
    }
}
