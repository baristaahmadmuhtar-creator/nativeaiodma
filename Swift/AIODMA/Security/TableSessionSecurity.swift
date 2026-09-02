import Foundation
import CryptoKit

public struct TableSession: Codable {
    public let outletId: String
    public let tableId: Int
    public let tableName: String
    public let timestamp: TimeInterval
    public let nonce: String
}

public final class TableSessionSecurity {
    private static let serverSecretKey = SymmetricKey(size: .bits256)
    
    /// Signs a table session payload with HMAC-SHA256
    public static func generateSignedToken(tableId: Int, outletId: String = "OUTLET-01") -> String {
        let timestamp = Date().timeIntervalSince1970
        let nonce = UUID().uuidString
        let rawPayload = "\(outletId):\(tableId):\(timestamp):\(nonce)"
        
        let payloadData = Data(rawPayload.utf8)
        let signature = HMAC<SHA256>.authenticationCode(for: payloadData, using: serverSecretKey)
        let signatureBase64 = Data(signature).base64EncodedString()
        
        return "\(payloadData.base64EncodedString()).\(signatureBase64)"
    }
    
    /// Verifies table session token and ensures table_id cannot be spoofed or bypassed
    public static func verifyQRToken(token: String) -> TableSession? {
        let parts = token.components(separatedBy: ".")
        guard parts.count == 2,
              let payloadData = Data(base64Encoded: parts[0]),
              let signatureData = Data(base64Encoded: parts[1]) else {
            return nil
        }
        
        let isValid = HMAC<SHA256>.isValidAuthenticationCode(signatureData, authenticating: payloadData, using: serverSecretKey)
        guard isValid,
              let rawPayload = String(data: payloadData, encoding: .utf8) else {
            return nil
        }
        
        let components = rawPayload.components(separatedBy: ":")
        guard components.count == 4,
              let tableId = Int(components[1]),
              let timestamp = TimeInterval(components[2]) else {
            return nil
        }
        
        return TableSession(
            outletId: components[0],
            tableId: tableId,
            tableName: "Meja \(tableId)",
            timestamp: timestamp,
            nonce: components[3]
        )
    }
    
    /// Enforces price shield: recomputes cart subtotal on native transaction boundary
    public static func validatePriceShield(cartItems: [CartItem], claimedSubtotal: Int) -> Bool {
        let computed = cartItems.reduce(0) { $0 + $1.totalPrice }
        return computed == claimedSubtotal
    }
}
