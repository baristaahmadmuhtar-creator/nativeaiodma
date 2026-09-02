import SwiftUI
#if canImport(ActivityKit) && canImport(WidgetKit)
import WidgetKit
import ActivityKit

public struct OrderTrackingAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        public var orderStatus: String
        public var progressPercent: Double
        public var estimatedMinutesRemaining: Int
        public var currentStep: String
        
        public init(orderStatus: String, progressPercent: Double, estimatedMinutesRemaining: Int, currentStep: String) {
            self.orderStatus = orderStatus
            self.progressPercent = progressPercent
            self.estimatedMinutesRemaining = estimatedMinutesRemaining
            self.currentStep = currentStep
        }
    }
    
    public var orderNumber: String
    public var tableName: String
    public var itemCount: Int
    
    public init(orderNumber: String, tableName: String, itemCount: Int) {
        self.orderNumber = orderNumber
        self.tableName = tableName
        self.itemCount = itemCount
    }
}

public struct OrderTrackingLiveActivityWidget: Widget {
    public var body: some WidgetConfiguration {
        ActivityConfiguration(for: OrderTrackingAttributes.self) { context in
            // MARK: - Lock Screen Banner View
            VStack(spacing: 12) {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("AIODMA COFFEE")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.secondary)
                        Text("\(context.attributes.tableName) • Order \(context.attributes.orderNumber)")
                            .font(.system(size: 15, weight: .black))
                    }
                    
                    Spacer()
                    
                    Text(context.state.orderStatus)
                        .font(.system(size: 12, weight: .heavy))
                        .foregroundColor(.black)
                        .padding(.horizontal, 10)
                        .padding(.vertical, 4)
                        .background(Color(hex: "10B981"))
                        .clipShape(Capsule())
                }
                
                // Progress Bar
                ProgressView(value: context.state.progressPercent)
                    .tint(Color(hex: "10B981"))
                
                HStack {
                    Text("\(context.attributes.itemCount) Item diproses")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundColor(.secondary)
                    Spacer()
                    Text("Estimasi: \(context.state.estimatedMinutesRemaining) mnt")
                        .font(.system(size: 12, weight: .bold))
                }
            }
            .padding(16)
            .background(Color(uiColor: .systemBackground))
            
        } dynamicIsland: { context in
            // MARK: - Dynamic Island View
            DynamicIsland {
                // Expanded Leading
                DynamicIslandExpandedRegion(.leading) {
                    VStack(alignment: .leading, spacing: 2) {
                        Text("AIODMA")
                            .font(.system(size: 11, weight: .bold))
                            .foregroundColor(.secondary)
                        Text(context.attributes.tableName)
                            .font(.system(size: 16, weight: .black))
                    }
                }
                
                // Expanded Trailing
                DynamicIslandExpandedRegion(.trailing) {
                    VStack(alignment: .trailing, spacing: 2) {
                        Text("ESTIMASI")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundColor(.secondary)
                        Text("\(context.state.estimatedMinutesRemaining) min")
                            .font(.system(size: 15, weight: .heavy))
                            .foregroundColor(Color(hex: "10B981"))
                    }
                }
                
                // Expanded Bottom
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 6) {
                        HStack {
                            Text(context.state.currentStep)
                                .font(.system(size: 12, weight: .semibold))
                            Spacer()
                            Text(context.attributes.orderNumber)
                                .font(.system(size: 12, weight: .heavy))
                        }
                        ProgressView(value: context.state.progressPercent)
                            .tint(Color(hex: "10B981"))
                    }
                }
            } compactLeading: {
                HStack(spacing: 4) {
                    Image(systemName: "cup.and.saucer.fill")
                        .foregroundColor(Color(hex: "10B981"))
                    Text(context.attributes.tableName)
                        .font(.system(size: 12, weight: .bold))
                }
            } compactTrailing: {
                Text(context.state.orderStatus)
                    .font(.system(size: 11, weight: .heavy))
                    .foregroundColor(Color(hex: "10B981"))
            } minimal: {
                Image(systemName: "cup.and.saucer.fill")
                    .foregroundColor(Color(hex: "10B981"))
            }
        }
    }
}
#endif
