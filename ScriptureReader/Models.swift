import Foundation

/// A single scripture verse, tokenized into tappable words.
struct Verse: Identifiable, Hashable {
    let id: Int
    let reference: String   // e.g. "John 3:16"
    let text: String        // full KJV verse text

    /// Words as displayed (punctuation kept for reading), split on spaces.
    var words: [WordToken] {
        text.split(separator: " ", omittingEmptySubsequences: true)
            .enumerated()
            .map { WordToken(index: $0.offset, display: String($0.element)) }
    }

    /// Number of words — used to label difficulty for young readers.
    var wordCount: Int { words.count }
}

/// One tappable word inside a verse.
struct WordToken: Identifiable, Hashable {
    let index: Int
    let display: String     // as shown, may carry punctuation e.g. "world,"

    var id: Int { index }

    /// Speakable / matchable form: letters and apostrophes only, lowercased.
    var clean: String {
        display.lowercased().filter { $0.isLetter || $0 == "'" }
    }

    /// Individual letters (alphabetic only) for the sound-it-out mode.
    var letters: [String] {
        display.filter { $0.isLetter }.map(String.init)
    }
}

/// The three ways a child can work through a verse.
enum ReadingMode: String, CaseIterable, Identifiable {
    case read      = "Read to me"
    case soundOut  = "Sound it out"
    case check     = "My turn"

    var id: String { rawValue }

    var emoji: String {
        switch self {
        case .read: return "📖"
        case .soundOut: return "🔤"
        case .check: return "🎤"
        }
    }

    var hint: String {
        switch self {
        case .read: return "Tap any word to hear it."
        case .soundOut: return "Tap a word, then tap each letter."
        case .check: return "Tap the mic and read it out loud!"
        }
    }
}
