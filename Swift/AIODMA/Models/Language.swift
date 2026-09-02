import Foundation

public enum AppLanguage: String, Codable, CaseIterable, Identifiable {
    case brunei = "ms-BN"
    case english = "en-US"
    case indonesia = "id-ID"
    
    public var id: String { rawValue }
    
    public var displayName: String {
        switch self {
        case .brunei: return "BRUNEI"
        case .english: return "ENGLISH"
        case .indonesia: return "INDONESIA"
        }
    }
    
    public var flagIcon: String {
        switch self {
        case .brunei: return "flag.fill"
        case .english: return "flag.fill"
        case .indonesia: return "flag.fill"
        }
    }
    
    public var selectLanguageTitle: String {
        switch self {
        case .brunei: return "SELECT LANGUAGE\nPILIH BAHASA"
        case .english: return "SELECT LANGUAGE"
        case .indonesia: return "SELECT LANGUAGE\nPILIH BAHASA"
        }
    }
    
    public var selectLanguageSubtitle: String {
        switch self {
        case .brunei: return "Sila pilih bahasa untuk diteruskan."
        case .english: return "Please choose a language to continue."
        case .indonesia: return "Please choose a language to continue.\nSila pilih bahasa untuk diteruskan."
        }
    }
    
    public var chatEmptyTitle: String {
        switch self {
        case .brunei: return "TANYA MENU DAN ORDER DI SINI"
        case .english: return "ASK MENU & ORDER HERE"
        case .indonesia: return "TANYA MENU DAN ORDER DISINI"
        }
    }
}
