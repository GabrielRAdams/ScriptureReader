import SwiftUI

/// Warm, friendly palette + a rounded display font for young readers.
enum Theme {
    static let bg          = Color(red: 0.99, green: 0.97, blue: 0.90)
    static let card        = Color.white
    static let ink         = Color(red: 0.20, green: 0.17, blue: 0.13)
    static let accent      = Color(red: 0.86, green: 0.45, blue: 0.16)   // warm orange
    static let accentSoft  = Color(red: 1.00, green: 0.86, blue: 0.66)
    static let speaking    = Color(red: 1.00, green: 0.80, blue: 0.35)   // highlight while reading
    static let correct     = Color(red: 0.42, green: 0.73, blue: 0.42)   // matched word
    static let sky         = Color(red: 0.36, green: 0.60, blue: 0.78)

    static func rounded(_ size: CGFloat, _ weight: Font.Weight = .bold) -> Font {
        .system(size: size, weight: weight, design: .rounded)
    }
}
